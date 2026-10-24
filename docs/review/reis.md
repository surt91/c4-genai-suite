# REI-S review

Scope: `services/reis/` at `ed920d6` (FastAPI RAG server). Paths are relative to `services/reis/rei_s/`.
Priorities: **P1** bug/security, **P2** important, **P3** nice-to-have. "Confirmed" means the code path was traced
end to end and, where noted, reproduced with a script or test; "unconfirmed" means plausible but not verified.

Context that shapes the severity: REI-S has no authentication and trusts its caller (the backend), which sends
numeric file ids and bucket paths built from numeric ids. Findings that need a malicious *caller* are therefore
defense in depth (P2); findings reachable through file *content* uploaded by any user are P1.

The *Status* column is filled in during the fix phase (see the end of the document).

## P1 – bugs / security

### P1-1 PDF previews embed arbitrary server files (LFI) and fetch URLs (SSRF) – confirmed (reproduced)
`services/formats/utils.py:67` (`HTML(string=html_doc).write_pdf(path)`).
Markdown passes raw HTML through, `.txt` files are rendered as Markdown, and the code/JSON/XML/YAML fences can be
closed by the file content. WeasyPrint's default URL fetcher follows `file://`, `http(s)://` and `ftp://`.
Scenario: a user uploads `x.md` containing `<link rel="attachment" href="file:///proc/self/environ">` to a bucket
with a file store; the stored preview PDF carries the REI-S environment (embedding/S3/DB credentials) as an
attachment and is downloadable via `GET /documents/pdf`. Reproduced with `/etc/hostname` for `.md` and `.json`.
`<img src="http://169.254.169.254/...">` turns every upload into an SSRF probe.
Fix: render with `URLFetcher(allowed_protocols={"data"})` (nothing in our HTML needs external resources).

### P1-2 A crashing chunking/conversion subprocess blocks a worker forever – confirmed (reproduced)
`services/store_service.py:110-163` (`queue.get()` without timeout).
Files above `FILESIZE_THRESHOLD` are processed in a spawned process. If the child dies without putting a result
(OOM kill, segfault in a parser, an exception that cannot be pickled, a bootstrap error) the parent waits forever:
the upload request never returns and one of the `WORKERS` threads is lost. Reproduced by accident with a probe
script whose child failed to bootstrap.
Fix: poll the queue and check `process.exitcode`; raise when the child exits without a result. Merge the two
copy-pasted helpers into one.

### P1-3 Large office files leak a converted PDF (and are converted twice) – confirmed (reproduced)
`services/formats/office_provider.py:22-24`, `services/formats/utils.py:71-119`, `services/multiprocess_utils.py`.
`OfficeProvider.process_file` converts to PDF and caches it in `file.preview_pdf_cache`. For files above the
threshold this runs in the spawned child, whose copy of the `SourceFile` is never deleted: every such upload
leaves `<tmp>/<uuid>/<name>.pdf` behind (reproduced), and with a file store the parent runs LibreOffice a second
time for the preview. On failure (`"giving up"`) the empty output directory leaks as well.
Fix: the child cleans up caches it created; `add_file` converts the preview first so the child reuses it; remove
the output directory on failure.

### P1-4 Every PDF download from S3 leaks a temp file and buffers the object in memory – confirmed
`services/filestores/s3.py:40`, `routes/files.py:138`.
`get_document` reads the whole object into memory and writes it to a new temp file; the route returns a
`FileResponse` for it and nobody deletes it. Every preview download permanently consumes disk in `TMP_FILES_ROOT`.
Fix: stream the object (S3 body / local file) to the client instead of materialising a temp file.

### P1-5 Search crashes or returns wrong chunks when a format provider is unavailable – confirmed (reproduced)
`services/store_service.py:289-298`.
`cleaned` is only assigned when a provider for `doc.metadata["format"]` is enabled. With chunks whose provider is
disabled (e.g. audio uploaded while `STT_TYPE` was set, then STT removed), the first such result raises
`UnboundLocalError` (500 for the whole search); later ones silently repeat the previous chunk (reproduced:
`['known', 'known']`). A chunk without `format` raises `KeyError`.
Fix: fall back to the document itself; use `.get("format")`.

## P2 – important

| ID | Finding | Location | Scenario / cost | Fix |
|----|---------|----------|-----------------|-----|
| P2-1 | OData filter injection in Azure AI Search – confirmed (unit test) | `services/vectorstores/azure_ai_search.py:206, 222, 226, 261` | Bucket, doc ids and chunk ids are interpolated into filters unescaped. `bucket="1' or bucket ne '1"` searches all buckets; `DELETE /files/x' or id ne '` deletes the whole index; ids containing spaces/commas are split by `search.in`'s default delimiters | Escape `'` as `''`; use `search.in(…, '\|')` with an explicit delimiter and reject ids containing it |
| P2-2 | Temp upload path derived from the client id – confirmed (reproduced) | `utils.py:15-26`, `routes/files.py:179, 234` | Prefix check `startswith(tempdir)` accepts `../tmpX/…` (reproduced writing to a sibling `…evil/pwned`); id `.` → 500; two concurrent uploads with the same id (retry, quick update) share and delete each other's temp file | Always use a random temp name; containment check with `os.path.commonpath` |
| P2-3 | Upload temp file leaked on client disconnect – confirmed | `routes/files.py:179-183, 234-237` | Streaming happens before the `try/finally`, so a disconnect or stream error mid-upload leaves the partial file | Move streaming into the `try` |
| P2-4 | File store delete/get not idempotent / wrong status – confirmed (test) | `services/filestores/s3.py:28-29`, `filesystem.py:25-35`, `routes/files.py:133-138` | Deleting a document without preview (uploaded before the file store was enabled, failed preview) deletes the chunks and then answers 404 (S3) or 500 (filesystem). The backend deletes before every file update, so such files can never be updated. `GET /documents/pdf` with the filesystem store answers 500 instead of 404 | Make `delete` a no-op for missing objects; return `None`/404 consistently |
| P2-5 | Failed ingestion leaves partial state; re-upload duplicates chunks – confirmed | `services/store_service.py:244-267` | The preview is stored before the chunks; a failure in batch 3/5 (rate limit exhausted, DB error) leaves the preview and batches 1–2 behind. Uploading an existing id again (retry after a backend timeout, update with a missing `indexName`, see backend review P2-20) appends a second set of chunks | Delete existing chunks of the id before adding; on failure best-effort delete chunks and preview |
| P2-6 | One SQLAlchemy engine per pgvector collection – confirmed | `services/vectorstores/pgvector.py:43-58` | Every index name gets its own engine with `pool_size=5, max_overflow=10`; N indexes can hold 15·N connections per REI-S replica and exhaust `max_connections` | Share one engine per URL |
| P2-7 | S3 adapter rebuilt on every call; errors swallowed – confirmed | `services/filestores/s3.py:52-79`, `services/store_service.py:73-78` | Each request (search: per result set, upload: twice) creates a boto3 client from the default session in a worker thread (not thread safe) and sends `create_bucket` under a global lock. Any `ClientError` from `create_bucket` (AccessDenied, BucketAlreadyExists owned by someone else, wrong region) is silently ignored and surfaces later as confusing upload errors | Cache the adapter per config; `head_bucket` first, create only on 404, re-raise other errors |
| P2-8 | No timeouts for LibreOffice/ffmpeg – confirmed | `services/formats/utils.py:98`, `services/formats/ffmpeg_utils.py:17` | A document or media file that makes `soffice`/`ffmpeg` hang (or a decompression bomb inside an OOXML zip) blocks a worker thread forever. Killing only `soffice` would leave `soffice.bin` running | Run in a new session with a timeout and kill the process group |
| P2-9 | Strict UTF-8 decoding of text formats – confirmed (test) | `services/formats/*_provider.py` (`file.buffer.decode()`), `utils.py:48` | A Windows-1252/Latin-1 `.txt`/`.csv`-like file fails with a generic 400; a UTF-8 BOM breaks JSON (`Unexpected UTF-8 BOM`) and leaks `﻿` into the first chunk; UTF-16 files (BOM) fail | Shared `decode_text`: BOM detection (UTF-8/16), UTF-8, fallback cp1252 with replacement |
| P2-10 | Transcription temp files leak on errors – confirmed | `services/formats/voice_transcription_provider.py:192-252`, `video_transcription_provider.py:68-79` | When ffmpeg fails at segment n or Whisper fails, segments n+1… (and the extracted audio track of a video) are never deleted | `try/finally` around the whole segment list / audio file |
| P2-11 | `rei_s/mcp.py` is dead and broken – confirmed | `mcp.py` | Not referenced by the image, compose, scripts or docs; starts a server on import, hardcodes `http://localhost:3201`, uses port 3202 (the eval service), and blocks the event loop with a sync `httpx` call. Keeps the `mcp` dependency | Remove module and dependency |

## P3 – nice-to-have

| ID | Finding | Location | Fix |
|----|---------|----------|-----|
| P3-1 | Audio duration truncated: `range(0, int(duration), …)` drops the tail after the last full segment boundary (`600.5 s` loses 0.5 s) and clips shorter than 1 s produce no transcript – confirmed | `voice_transcription_provider.py:193` | `math.ceil(duration)` |
| P3-2 | Whisper runs twice per audio/video upload with a file store (known) | `voice_transcription_provider.py:269-274` | Cache the transcript on the `SourceFile` |
| P3-3 | `.swift` mapped to `Language.SCALA`; `get_language` is case sensitive while `supports` is not, so `MAIN.PY` fails with 400 – confirmed | `code_provider.py:23, 65` | `Language.SWIFT`; case-insensitive lookup |
| P3-4 | Azure: `get_index` round trip (under a global lock) on every request; `get_documents` embeds an empty query and runs a hybrid search to fetch by id | `azure_ai_search.py:149-158, 260-262` | Remember known indexes; plain filtered search |
| P3-5 | Dead code: `previewable` (never read), `DevNullFileStoreAdapter` (prod-unused), `UploadRequest`/`DocumentResponse`/`SourceKey`, `None` checks on required headers, double `get_file_store` in `add_file`, providers instantiated twice per class in nondeterministic (set) order, `VideoTranscriptionProvider.process_file` extracting the audio track twice | various | Remove / simplify |
| P3-6 | Config: wrong switch value in the error (`"filesystemsearch"`), duplicated words in the S3 message, default index names not validated with the same rules as `indexName` | `config.py:62, 170` | Fix messages, validate defaults |
| P3-7 | `take <= 0` reaches the vector store (500 from Postgres) | `routes/files.py:70` | `Query(gt=0)` |
| P3-8 | ffmpeg stderr (with server temp paths) is returned in HTTP error details | `voice_transcription_provider.py:149-151` | Log stderr, return a generic message |
| P3-9 | No upload size limit in REI-S although 413 is documented; relies on the backend limits | `routes/files.py:160-196` | Optional `MAX_FILE_SIZE`, abort the stream with 413 |
| P3-10 | Splitter boilerplate (`__init__` defaults, `splitter()`) duplicated in 9 providers | `services/formats/*` | Common base class |
| P3-11 | HTML and Outlook HTML bodies are chunked with markup (tags, inline CSS) | `html_provider.py:35`, `outlook_provider.py:39` | Strip markup before chunking |
| P3-12 | Whole files read into memory (`file.buffer`) for PDF parsing and the filesystem store | `pdf_provider.py:38`, `filesystem.py:22` | Pass file objects / `shutil.copyfile` |
| P3-13 | No authn/authz; `GET /documents/content` and `/documents/pdf` are not scoped to a bucket | `routes/files.py` | Shared secret or network policy; scope by bucket |
| P3-14 | Azure delete fetches chunk ids with one search; relies on SDK paging beyond 50 hits – unconfirmed | `azure_ai_search.py:206` | Verify against a real service |

## Status

Every fixed bug has a regression test. The test suite grew from 88 to 153 tests.

| ID | Status | Commit |
|----|--------|--------|
| P1-1 | Fixed (WeasyPrint only allows `data:` URLs) | `697b4b2` |
| P1-2 | Fixed (`run_in_process` polls and fails when the child exits without result; helpers merged) | `25e65aa` |
| P1-3 | Fixed (the child hands the preview to the parent, which reuses it; output dir removed on failure in `b307989`) | `25e65aa` |
| P1-4 | Fixed (file stores return a stream, `GET /documents/pdf` streams it) | `e247f96` |
| P1-5 | Fixed | `7219e0a` |
| P2-1 | Fixed (also `get_documents` is a plain filter query now, part of P3-4) | `21f4671` |
| P2-2 | Fixed (random temp names, direct-child check) | `5047dc4` |
| P2-3 | Fixed | `5047dc4` |
| P2-4 | Fixed (`delete` idempotent, `open_document` returns `None` → 404; filesystem ids with path components are rejected) | `e247f96` |
| P2-5 | Fixed (existing chunks deleted before adding, rollback on failure). The backend side (missing `indexName`) stays with backend review P2-20 | `cfadf92` |
| P2-6 | Fixed | `8591bd7` |
| P2-7 | Fixed (adapters cached per config, `head_bucket` before `create_bucket`) | `9801e81` |
| P2-8 | Fixed (LibreOffice 10 min, ffprobe 1 min, ffmpeg 1 h; process group killed) | `b307989` |
| P2-9 | Fixed | `3b3107e` |
| P2-10 | Fixed | `d1debde` |
| P2-11 | Fixed (module and `mcp` dependency removed, nine transitive packages less) | `e6fe6ab` |
| P3-1 | Fixed | `d1debde` |
| P3-2 | Fixed (transcription cached on the `SourceFile`) | `329325f` |
| P3-3 | Fixed | `71496b3` |
| P3-4 | Fixed (known indexes remembered; `get_documents` in `21f4671`) | `107e415` |
| P3-5 | Fixed: `previewable` (`329325f`), `DevNullFileStoreAdapter` (`e247f96`), header `None` checks (`5047dc4`), double `get_file_store` (`cfadf92`), video double extraction (`d1debde`), DTOs and provider registry (`2eb4edb`) | |
| P3-6 | Messages fixed (also wrong variable names in the nvidia/openai-compatible checks). Validating the default index names is deferred: pgvector accepts names the Azure rules reject, so it could break existing deployments at startup | `136c611` |
| P3-7 | Fixed (spec: `take` has `exclusiveMinimum: 0`; the generated backend client is unchanged) | `4712bbe` |
| P3-8 | Fixed | `611f5c3` |
| P3-9 | Fixed: optional `MAX_FILE_SIZE` (default unlimited, as before) | `5047dc4` |
| P3-10 | Deferred: touches all providers for little gain; better done together with a decision on P3-11 | |
| P3-11 | Deferred: changes what is indexed for existing HTML/e-mail uploads; needs a product decision (and re-indexing) | |
| P3-12 | Fixed for PDFs (`9ce7f24`) and the filesystem store (`e247f96`); text formats still read the file at once (they are split in memory anyway) | |
| P3-13 | Mitigated: no app-level auth (decision); the helm chart restricts the access with a NetworkPolicy by default and Compose binds the port to 127.0.0.1 (`feat(helm): restrict the access to REI-S with a NetworkPolicy by default`). The document endpoints are still not scoped to a bucket. | |
| P3-14 | Deferred: unconfirmed, needs a real Azure AI Search service | |

Behavior changes worth knowing:
- `POST /files` with an existing id replaces the document (was: appended a second set of chunks).
- `DELETE /files/{id}` succeeds when no pdf preview exists (was 404 for S3, 500 for the filesystem store);
  `GET /documents/pdf` answers 404 for missing documents with the filesystem store (was 500).
- `GET /files` with `take <= 0` answers 422 (was 500).
- Error details of failed audio/video uploads no longer contain the ffmpeg output.
- New optional setting `MAX_FILE_SIZE` (413 when exceeded).
- Text files in Windows-1252 or with BOM are accepted (were 400).
