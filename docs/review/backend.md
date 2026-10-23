# Backend review

Scope: `backend/` at `ed920d6` (NestJS + TypeORM + ai-sdk). Paths are relative to `backend/src/`.
Priorities: **P1** bug/security, **P2** important, **P3** nice-to-have. "Confirmed" means the code path was traced
end to end (and, where noted, reproduced in a test or script); "unconfirmed" means plausible but not verified.

The fix status of every finding is listed in the section *Status* at the end.

## P1 – bugs / security

### P1-1 Users can search and attach other users' conversation files (IDOR) – confirmed
`extensions/tools/files-conversation.ts:60-61`, `domain/chat/middlewares/get-history-middleware.ts:119-155`,
`domain/chat/use-cases/send-message.ts`.
`SendMessageDto.files` comes straight from the client. The conversation-files tool loads them with
`files.findBy({ bucketId, id: In(ids) })` (no `userId`), and `SearchFiles` searches the conversation bucket with
`ragBucket = null`, filtering only by those (sequential, guessable) ids. `attachNewFilesToConversation` additionally
links the foreign file into the attacker's conversation permanently.
Scenario: user A posts `files: [{ id: <B's file id> }]` to `/conversations/<own>/messages/sse` and receives
snippets of B's document (and its name in the tool description).
Fix: validate in `SendMessage` that every referenced file belongs to the user (403 otherwise); add the `userId`
filter to the tool query as defense in depth.

### P1-2 REI-S bucket credentials returned to every user – confirmed
`controllers/files/files.controller.ts:98-117`, `controllers/files/dtos/index.ts:258`.
`GET /buckets` and `GET /buckets/:id` only require a login; `BucketDto` contains `headers` (REI-S
`Authorization`/API keys) and the endpoint. The frontend only calls them from admin pages.
Fix: admin-only (`@Role(admin)`).

### P1-3 Executor credentials returned to every user – confirmed
`controllers/extensions/configurations.controller.ts:65-81`, `controllers/extensions/dtos/index.ts:800`.
`GET /configurations` is the assistant list for normal users, but `ConfigurationDto` contains `executorHeaders`
(bearer tokens) and `executorEndpoint`. The audit log already treats them as secrets.
Fix: strip both fields for non-admins.

### P1-4 Any user can read the extension configuration of any assistant – confirmed
`controllers/extensions/configurations.controller.ts:178-190`.
`GET /configurations/:id/extensions` has no role or user-group check and includes disabled extensions.
`maskKeyValues` only masks `format: 'password'` arguments, so MCP/OpenAPI `headers` (textarea, e.g.
`Authorization=Bearer …`), endpoints and system prompts of restricted assistants are exposed. Only the admin UI
uses the endpoint.
Fix: admin-only.

### P1-5 OpenAPI tools are cached with the first user's context – confirmed
`extensions/tools/open-api.ts:66-77`, `domain/chat/cache.ts`.
`InternalTool` instances (holding `context`: user, result stream, UI) are stored in the singleton
`ChatCacheImpl` for 10 minutes, keyed only by the extension values. For the next 10 minutes every other user's
tool calls send user A's id/name/email to the tool server, UI forms/debug output go to A's (closed) stream and
B's chat hangs waiting for a form answer.
Fix: cache only the tool list; build the tools per request.

### P1-6 MCP clients/connections are never closed – confirmed
`extensions/tools/mcp-tools.ts:538-579`.
Every chat message with an MCP extension (and every `buildSpec`, test and document download) creates a `Client`
with an SSE/streamable-HTTP transport and never closes it; also not when connect or `tools/list` fail. Each
message leaks a long-lived SSE connection on both sides until the process (or the MCP server) runs out of sockets.
Fix: close the client in `finally` after the request (chat: after `next(context)`).

### P1-7 Session cookie `SameSite=None` enables CSRF – confirmed (code path)
`config/cookies.ts:24-31`, `main.ts:19`.
With an `https` base URL the session cookie is `SameSite=None`. There is no CSRF token, and the API accepts
`application/x-www-form-urlencoded` bodies (`extended: true`, so arrays work), which a cross-site HTML form can send
without a CORS preflight. Scenario: an admin visits a malicious page that auto-submits a form to
`POST /api/users` with `userGroupIds[]=admin` → a new admin account. No embedding/iframe use of the app exists.
Fix: `SameSite=Lax` (keeps the cookie on the top-level OAuth callback redirects).

## P2 – important

| ID | Finding | Location | Scenario / cost | Proposed fix |
|----|---------|----------|-----------------|--------------|
| P2-1 | Client disconnect / "stop" never aborts the LLM call – confirmed (Node 24 script: `req` `close` has already fired once the body was read, a listener added later never runs) | `controllers/conversations/conversations.controller.ts:263-274` | Generation (tokens, tool calls) continues after the user pressed stop or closed the tab | Listen on `res` `close` before awaiting the stream, abort if the response did not finish |
| P2-2 | SSE response not ended after a pipeline error; errors thrown before the stream serialize as `{}` | same file `:266`, `:276` | Hanging connections; client receives an empty error object | `response.end()` after the error event; serialize `{ message }` |
| P2-3 | Session fixation: session id not regenerated on login | `domain/auth/auth.service.ts` `setSessionUser` | A session id known before login (e.g. from the OAuth start) is authenticated afterwards | `req.session.regenerate()` before storing the user |
| P2-4 | Sessions never expire server-side | `domain/auth/session-storage.ts` | The 7-day max age is only enforced by the browser; a copied cookie works forever | Reject and delete sessions whose `cookie.expires` is in the past |
| P2-5 | Open redirect after login – confirmed | `controllers/auth/auth.controller.ts:113` | `post-login-redirect` is set by the frontend from `location.pathname`; `//evil.com` passes `startsWith('/')` → `res.redirect('//evil.com')` | Only allow `/` not followed by `/` or `\` |
| P2-6 | `AUTH_INITIALUSER_APIKEY` stored unhashed – confirmed | `domain/auth/auth.service.ts` `setupAdmins` | Lookup hashes the header (`LocalStrategy`), so the configured key never works | Hash on store (shared `hashApiKey` helper) |
| P2-7 | Token limit errors surface as "internal error"/500 – confirmed | `domain/chat/middlewares/check-usage-middleware.ts:16`, `send-message.ts:126` | CheckUsage has the same order as ExceptionMiddleware and is registered first, i.e. runs outside it; its `HttpException` becomes `errorInternal` | Run inside ExceptionMiddleware and throw a `ChatError` with a localized message |
| P2-8 | Token limit sums include ratings – confirmed | `check-usage-middleware.ts:56-72` | Each rating row (`counter='rating'`, count 1) is counted as a token | Filter `counter: 'token_usage'` |
| P2-9 | Aborted streams are not counted as usage – confirmed | `domain/chat/middlewares/execute-middleware.ts:72` | `onFinish` is not called on abort; stopping each answer just before the end bypasses token limits | Also record usage in `onAbort` (sum of finished steps) |
| P2-10 | SendMessage does not re-check assistant access – confirmed | `domain/chat/use-cases/send-message.ts:76` | After an admin disables an assistant or removes the user's group, existing conversations keep using it | Check status + user groups (shared helper with `GetConfigurations`) |
| P2-11 | Responses API uploads files / uses disabled extensions before the access check – confirmed | `controllers/responses/api.responses.controller.ts:258-266, 345` | Files are uploaded to the assistant's bucket for assistants the user cannot use; disabled extensions are used | Check access first; `includeDisabled=false` |
| P2-12 | Reasoning effort ignored for OpenAI-compatible and NVIDIA models – confirmed | `extensions/models/open-ai-compatible.ts:170`, `nvidia.ts:158` | `@ai-sdk/openai-compatible` reads `providerOptions.openaiCompatible`, not `openai` | Use the `openaiCompatible` key |
| P2-13 | Document download crashes for non-Latin-1 file names – confirmed | `controllers/conversations/conversations.controller.ts:240` | `setHeader` throws `ERR_INVALID_CHAR` (500) for e.g. "–", CJK, emoji; `"` breaks the header | RFC 5987 `filename*=UTF-8''…` + ASCII fallback |
| P2-14 | Executor receives the whole history as `ai` messages; headers with `=` in values are truncated – confirmed | `domain/chat/middlewares/executor-middleware.ts:65-75, 104` | Executor cannot distinguish user and assistant turns; `Authorization=Basic abc==` loses padding | Map `human→user`, system messages → `system`; shared header parser |
| P2-15 | OpenAPI tool header parsing corrupts values (split on every `=` and on `,`/`;`) – confirmed | `extensions/tools/open-api.ts:96-103` | Base64 tokens and values with `,`/`;` break; three different parsers exist | Shared `parseHeaders` (one `key=value` per line or `,`/`;`, split at first `=`) |
| P2-16 | OpenAPI tool is executed with the internal (prefixed) name – confirmed (code vs. spec) | `extensions/tools/open-api.ts:209` | `tool` is `"<externalId>_<name>"` although the spec defines it as the name listed by `GET /tools` | Send `tool.name` |
| P2-17 | One unreachable MCP server breaks every chat of the assistant – confirmed | `extensions/tools/mcp-tools.ts:478` | `getTools` throws inside `invoke` → `errorInternal`; OpenAPI already degrades gracefully | Catch, log, continue without the tools |
| P2-18 | Summary "history size" setting never applies – confirmed | `extensions/other/summary.ts:25,37` | Argument is `historySize`, middleware reads `historyLength` | Read `historySize` |
| P2-19 | Import gives extensions non-unique `externalId`s – confirmed | `domain/extensions/use-cases/import-configuration.ts:101` | Two extensions of the same type in one assistant share `<configId>-<name>` → tool-name collisions, wrong extension in `GetExtension({externalId})` | Leave it `NULL` so the DB trigger generates `<name>_<id>` |
| P2-20 | REI-S delete without index name – confirmed | `domain/files/use-cases/delete-bucket.ts:57`, `upload-file.ts:182` | Buckets with a custom index keep stale chunks after re-upload/bucket deletion (duplicate/outdated search hits) | Pass `bucket.indexName` |
| P2-21 | Failed file update deletes the original – confirmed | `domain/files/use-cases/upload-file.ts:182, 252-255` | `PUT` with a broken file: old REI-S document deleted first, then the catch deletes the existing DB row | Only delete rows created by this request |
| P2-22 | Partial upload failure leaves REI-S orphans – confirmed | `upload-file.ts:220-256` | Vector upload succeeded, `processFile` failed → DB row deleted, chunks stay forever | Delete the REI-S document in the catch |
| P2-23 | Unlimited, untyped uploads into Postgres – confirmed | `controllers/files/user-files.controller.ts:131-138`, `upload-file.ts:67-101`, `app.module.ts:51` | Any enabled extension id (e.g. an LLM) without `bucket` → stored base64 in `blobs` with no size/type check; multer has no `limits`, so every upload is fully buffered in memory | Global multer `fileSize` limit; bucketless uploads only for `files*` extensions with matching `fileNameExtensions` and a size cap |
| P2-24 | Upload into another user's conversation – confirmed (low impact) | `upload-file.ts:84, 247` | `conversationId` is not checked → `conversations_files` row in a foreign conversation | Check ownership in the controller |
| P2-25 | Duplicating a conversation scans everybody's conversation names – confirmed | `domain/chat/use-cases/duplicate-conversation.ts:55` | Number in "(n)" leaks the existence of other users' titles; full-table scan; no transaction | Scope by `userId`, run in a transaction |
| P2-26 | Eval proxy corrupts multipart/urlencoded requests and repeated query params – confirmed | `controllers/eval/eval.controller.ts:72-115` | QA catalog uploads send `"{}"` with the multipart content type; `?a=1&a=2` → `a=1,2`; hop-by-hop headers copied | Forward the raw query string, stream non-JSON bodies, drop hop-by-hop headers |
| P2-27 | Orphaned files/chunks when conversations or users are deleted – confirmed | `domain/chat/use-cases/delete-conversation(s).ts`, `domain/users/use-cases/delete-user.ts` | Conversation files, blobs and REI-S chunks stay (GDPR) | Deferred, see below |
| P2-28 | Upload errors after 3 s arrive as HTTP 200 with a body of newlines – confirmed | `controllers/files/keep-alive.ts` | `keepAlive` flushes 200 headers; a later error cannot change the status | Deferred, see below |
| P2-29 | Microsoft login matches users by the mutable `mail` attribute with tenant `common` by default (nOAuth) – unconfirmed (depends on the IdP setup) | `domain/auth/strategies/microsoft-strategy.ts`, `auth.service.ts` `login` | A user of any Entra tenant can set `mail` to a victim's address and is logged in as the victim | Deferred: warn at startup when no tenant is configured |
| P2-30 | Importing an exported configuration stores the mask `********************` as secret – confirmed | `import-configuration.ts:150` | Imported assistants silently have invalid API keys | Deferred, see below |
| P2-31 | Rebuild/test returns unmasked secrets and doesn't check that `id` and `name` match (admin only) – confirmed | `domain/extensions/use-cases/rebuild-extension.ts:48-60` | Stored keys returned in plain text; a stored key can be sent to another endpoint | Mask the response |

## P3 – nice-to-have

| ID | Finding | Location |
|----|---------|----------|
| P3-1 | Login distinguishes "Unknown user" and "Wrong password" (user enumeration) | `domain/auth/auth.service.ts` `loginWithPassword` |
| P3-2 | Changing the password of an SSO user without password → 500 (`bcrypt.compare` with `undefined`) | `domain/users/use-cases/update-user.ts:45` |
| P3-3 | GitHub scopes `profile email` are no GitHub scopes; users without a public e-mail cannot log in | `domain/auth/strategies/github-strategy.ts` |
| P3-4 | `Authorization` listed twice in the API key headers (headers are lower-cased); `Bearer` prefix case-sensitive | `domain/auth/strategies/local-strategy.ts` |
| P3-5 | SHA-256 API key hashing duplicated in 4 places | `create-user.ts`, `update-user.ts`, `auth.service.ts`, `local-strategy.ts` |
| P3-6 | Config docs drift: `AUTH_TRUST_COOKIE`, `LOG_RAG_CHUNKS`, `LOG_LLM_AGENT` documented but unused; `AUTH_BASEURL`, `AUTH_LOGOUT_REDIRECT`, `AUTH_LOGIN_ALLOWED_GROUPS`, `AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER`, `AUTH_USER_GROUPS_PROPERTY_NAME`, `EVAL_SERVICE_*`, `DEBUG_MODEL_REQUESTS` used but undocumented | `docs/Configuration.md` |
| P3-7 | `CompleteMiddleware.order = Number.MIN_VALUE` is the smallest *positive* number, not the most negative | `domain/chat/middlewares/complete-middleware.ts:6` |
| P3-8 | NVIDIA tool-call repair only replaces the first `"content":""` | `extensions/models/nvidia.ts:135` |
| P3-9 | `?enabled=false` is the truthy string `"false"` | `controllers/extensions/configurations.controller.ts:74` |
| P3-10 | `@HealthCheck()` on `POST /responses`; uploaded file name taken from `file.filename` (undefined with memory storage) | `controllers/responses/api.responses.controller.ts:256, 368` |
| P3-11 | `ChatCacheImpl` key uses `${value}` → objects collide as `[object Object]` | `domain/chat/cache.ts:47` |
| P3-12 | `editMessageId` is not scoped to the conversation (parent from a foreign conversation) | `domain/chat/middlewares/get-history-middleware.ts:187` |
| P3-13 | `@Param('id') id: number` without `ParseIntPipe` (no global `transform`): non-numeric ids → 500 from Postgres | conversations, configurations, files controllers |
| P3-14 | `GET /users` has no ordering → unstable pagination; search says "email" but searches name | `domain/users/use-cases/get-users.ts` |
| P3-15 | Wrong inverse sides: `UserEntity.conversations` → `conversation.configuration`, extension → `configuration.conversations` | `domain/database/entities/user.ts`, `extension.ts:50` |
| P3-16 | `GET /blobs/:id` serves every blob category inline without `nosniff` | `controllers/blobs/blobs.controller.ts` |
| P3-17 | `AsyncLocalStorage.disable()` per request on a handler-wide store (latent cross-request clearing) | `domain/chat/use-cases/send-message.ts:136` |
| P3-18 | `buildAuditLog` duplicated | `domain/audit-log/use-cases/get-audit-log(s|-by-id).ts` |
| P3-19 | Debug request logging buffers streamed responses and throws on non-string bodies | `lib/log-requests.ts:36-40` |
| P3-20 | `rejectUnauthorized: false` for every REI-S call | `domain/files/use-cases/utils.ts:82` |
| P3-21 | Prometheus metrics use the user id as label (unbounded cardinality) | `metrics/metrics.service.ts` |
| P3-22 | Token limits: only the first user group is checked; built-in groups are always exempt | `check-usage-middleware.ts:30-38` |
| P3-23 | Large files: `controllers/extensions/dtos/index.ts` (1048 lines), `conversations/dtos` (643); the 8 model providers duplicate middleware/test/option code | – |
| P3-24 | `UpdateConfigurationUserValues` is a query handler; user-values endpoints don't check assistant access | `domain/extensions/use-cases/update-configuration-user-values.ts` |
| P3-25 | Transcription accepts any extension id; MCP errors include the endpoint (may contain keys); Brave/Bing ignore the abort signal | various |

## Checked and fine
- All admin routes (users, user groups, usages, audit log, settings writes, configuration/extension writes, bucket
  writes, eval proxy) use `LocalAuthGuard` + `RoleGuard` with the admin group; the eval proxy target is fixed by
  `EVAL_SERVICE_URL` (no SSRF). MCP/OpenAPI/executor URLs can only be configured by admins.
- Conversation endpoints check ownership (get, patch, delete, messages, rate, duplicate, documents, chunks,
  SendMessage via `GetConversation`); `GetFiles`/`DeleteFile` are scoped to the user.
- Session cookie is `httpOnly` (express-session default); `SESSION_SECRET` is enforced in production.
- Entities vs. migrations: no drift (`migration:run` + `migration:generate` report no changes).

## Status

Fixed on branch `worktree-agent-a161c03d7715338b1` (one commit per fix, regression test unless noted).
Counts: 7 × P1, 31 × P2, 25 × P3.

The executor feature (P1-3, P2-14) has since been removed completely (`feat!: remove the executor feature`).

| ID | Status | Commit / reason |
|----|--------|-----------------|
| P1-1 | fixed | `0d94c8c` only allow own files when sending a message |
| P1-2 | fixed | `f26b89c` restrict reading buckets to admins (**API: non-admins get 403**) |
| P1-3 | fixed | `3d8a5f4` hide executor credentials from regular users |
| P1-4 | fixed | `c6f9307` restrict reading extension configurations to admins (**API: non-admins get 403**) |
| P1-5 | fixed | `c47ecf6` do not share OpenAPI tool instances between users |
| P1-6 | fixed | `1cfdde8` close MCP clients after use |
| P1-7 | fixed | `d0b9d3e` SameSite=Lax (**cookie not sent on cross-site subrequests anymore**) |
| P2-1, P2-2 | fixed | `d845a1e` (+ `737c1ee` test) abort the generation on disconnect, end SSE after errors (**stop really stops the answer**) |
| P2-3 | fixed | `517253f` regenerate the session id on login |
| P2-4 | fixed | `4e80626` server-side session expiry |
| P2-5 | fixed | `093909c` open redirect after login |
| P2-6 | fixed | `33e0084` hash AUTH_INITIALUSER_APIKEY (+ P3-4, P3-5) |
| P2-7, P2-8 | fixed | `2b83905` token limit message reaches the user, ratings not counted (**new message instead of "Internal error"**) |
| P2-9 | partially fixed | `a33f831` finished steps of aborted answers and failed requests are counted, non-streaming counts all steps; the interrupted step itself is not reported by the providers |
| P2-10 | fixed | `d65cef4` assistant access re-checked on every message (**old chats of disabled/restricted assistants fail**) |
| P2-11 | fixed | `a676a2c` responses API checks access first (404), ignores disabled extensions; follow-ups `ad50717` (P3-10), `ab830ff` (**POST /responses returns 200 instead of 201**; external spec regenerated) |
| P2-12 | fixed | `62d8527` reasoning effort for OpenAI compatible/NVIDIA (+ P3-8) (**`reasoning_effort` is sent when configured**) |
| P2-13 | fixed | `6e739a6` Content-Disposition for any file name |
| P2-14 | fixed | `ba20346` executor history types (**executors receive `system`/`user`**) and `1073258` header parsing; the executor request is aborted with the chat |
| P2-15 | fixed | `1073258` one shared header parser for bucket/executor/OpenAPI/MCP headers |
| P2-16 | fixed | `647abca` OpenAPI tools called by their listed name (**tool servers see the plain name**) |
| P2-17 | fixed | `d3fc5db` unreachable MCP server: chat continues without its tools |
| P2-18 | fixed | `2106103` summary history size |
| P2-19 | fixed | `3c54ddf` unique external ids on import |
| P2-20 | fixed | `01cf199` REI-S deletes use the bucket's index |
| P2-21 | deferred | REI-S has no replace operation (re-adding the same id duplicates chunks), so the old document must be deleted before the new upload; keeping the original on failure needs a "failed" upload status (enum + migration + UI) or a replace endpoint in REI-S. Admin-only. |
| P2-22 | fixed | `01cf199` partial uploads are removed from REI-S |
| P2-23, P2-24 | fixed | `8c12107` UPLOAD_MAX_FILE_SIZE_MB (default 512), only `files*` extensions, bucketless uploads only with matching file types and ≤ 20 MB, conversation ownership (**larger/other uploads rejected**) |
| P2-25 | fixed | `74af62c` duplicate numbering scoped to the user (transaction: deferred, low risk) |
| P2-26 | fixed | `19cb2a8` eval proxy streams non-JSON bodies, keeps the query string, drops hop-by-hop headers |
| P2-27 | deferred | Needs a decision on the cleanup strategy (delete in the use cases incl. REI-S calls vs. a periodic orphan sweep) and tests against REI-S; no quick safe fix. |
| P2-28 | deferred | Fixing it needs a protocol change for the upload response (e.g. a JSON error object after the keep-alive newlines) and the matching frontend handling, which is being refactored on another branch. |
| P2-29 | mitigated | `58700c6` warning at startup and documentation; restricting the e-mail matching (e.g. by provider + subject) changes the account linking and needs a migration of existing users |
| P2-30 | deferred | Needs a product decision (reject the import, drop masked values and require re-entry, or a warning in the UI). |
| P2-31 | fixed | `1745066` rebuild masks secrets; rebuild/test check the extension type |
| P3-1 | fixed | `7e8ec54` same login error for unknown users and wrong passwords (**message changed**) |
| P3-2 | fixed | `c0ceee2` 400 for password changes of users without password |
| P3-3 | fixed | `0bf76ad` GitHub `user:email` scope |
| P3-4, P3-5 | fixed | `33e0084` |
| P3-6 | fixed | `3ce48ee` configuration reference synced |
| P3-7 | deferred | Moving CompleteMiddleware outside the ExceptionMiddleware changes the event order on errors (no `completed` after `error`), which the frontend may rely on; left as is. |
| P3-8 | fixed | `62d8527` |
| P3-9 | fixed | `5da2215` `enabled` parsed as boolean |
| P3-10 | fixed | `ad50717` |
| P3-11 | fixed | `380f673` |
| P3-12 | fixed | `9cf53a1` |
| P3-13 | fixed | `3890730` ParseIntPipe on the id parameters (non-numeric ids → 400) |
| P3-14 | fixed | `b74d8e7` stable order, search by name or e-mail, escaped wildcards |
| P3-15 | fixed | `92ac4c2` (metadata only; migration:generate reports no changes) |
| P3-16 | fixed | `c591465` blobs: only images/logos, `nosniff` |
| P3-17 | fixed | `38db1c6` (refactor, no test) |
| P3-18 | fixed | `4101348` (refactor) |
| P3-19 | fixed | `df2993f` debug logging async, safe parsing, keys redacted in URL and `*key*` headers |
| P3-20 | deferred | Enabling TLS verification breaks deployments with self-signed REI-S certificates; needs a config option (e.g. `REIS_TLS_INSECURE`) and a release note. |
| P3-21 | deferred | Removing the user label changes existing dashboards/alerts. |
| P3-22 | deferred | Semantics of limits for users in several groups (most restrictive vs. first) need a product decision; built-in groups cannot have limits by design. |
| P3-23 | deferred | Splitting the DTO files and a shared base for the model providers are larger refactorings; better done separately from the security fixes. |
| P3-24 | deferred | Low impact (only the user's own values); the command/query mix-up is cosmetic. |
| P3-25 | deferred | Transcription access check, endpoint in MCP errors and abort support for Brave/Bing: low impact, not done in this pass. |

Not touched: `e2e/` and the frontend. The frontend client did not need to be regenerated (`backend-dev-spec.json`
is unchanged; only `backend-external-spec.json` changed for `POST /responses`). UI-visible changes that e2e tests
might assert: the login error message, the token limit message, stop really stopping the answer, 403 for non-admins
on `GET /buckets` and `GET /configurations/:id/extensions`, and rejected bucketless uploads of other file types.
