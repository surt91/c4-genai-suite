# Ungenutzte und tote Features

Stand: Oktober 2026. Untersucht wurden Backend, Frontend, REI-S, Eval, Helm-Chart, Compose und E2E.

Methode:

- knip für Frontend (Repo-Konfiguration) und Backend (temporäre Konfiguration)
- vulture für REI-S und Eval
- Skripte, die gegeneinander abgleichen:
  - die Methoden der generierten Clients mit ihren Aufrufstellen
  - Backend-Endpoints mit den Aufrufern (Frontend, E2E, Confluence-Importer)
  - registrierte CQRS-Handler mit ihren Dispatches
  - i18n-Keys mit ihrer Nutzung
  - gelesene Env-Variablen mit den gesetzten bzw. dokumentierten
  - Helm-Values mit den Templates

Jeder Befund wurde per grep geprüft.

## 1. Bereits entfernt (ohne Verhaltensänderung)

Das Executor-Feature wurde separat entfernt (`feat!: remove the executor feature`). Außerdem wurde eindeutig toter Code
in eigenen `refactor:`-Commits entfernt:

| Komponente | Entfernt |
|---|---|
| Backend | Nicht registrierte Beispiel-Extensions `always-42`, `confirm`, `simple-input` sowie 27+3 unbenutzte i18n-Keys (Reste entfernter Extensions wie Langfuse, VertexAI, Hub-Prompt, Azure-o) |
| Backend | `isObject`/`isBoolean`/`isRegExp`/`isDate`, `AuthUser`, `StreamStartMetadataDto`, `Settings.fileServer` und die nie verwendete Query `GetUserGroup` samt Handler |
| Frontend | 94 unbenutzte Texte (de + en), u. a. die Texte der QA-Katalog-Generierung und eines entfernten Eval-Endpoint-Typs |
| REI-S | `audio_codecs_to_mime_type` und die Migrationsanleitung für den nicht mehr vorhandenen `/files/import`-Endpoint |
| Eval | Funktionen ohne Aufrufer, z. B. `find_grouped_results`, `update_evaluation_status`, `fail_test_case`, `DeepEvalCustomEmbeddings`, `NewSessionDep`; außerdem `save_output_as_json` und `create_backup`, die nur von ihren eigenen Tests aufgerufen wurden |
| Eval | Nie gelesene Settings: `EVALUATION_MAX_RETRIES`, `EVALUATION_PARALLEL_GENERATION_LIMIT`, `RAGAS_*` und `PG_SCHEMA` (das Schema ist im Modell fest `llm_eval`) |
| Helm, Compose, E2E | `reis.embeddings.openAi.deploymentName`, `VERSION` bei `reis` und `ENV` in den E2E-Tests |

Bewusst **nicht** angefasst wurde Code in `backend/src/domain/chat/**`, `frontend/src/pages/chat/**` und den
`chat.*`-Texten, weil parallel am Chat-Streaming gearbeitet wird. Dort ist noch übrig:

- `FormActionType.REJECT` in `backend/src/domain/chat/interfaces.ts:53`, ohne Nutzung
- `export` von `TTLMap` in `backend/src/domain/chat/cache.ts:10`, wird nur in der eigenen Datei verwendet
- 8 unbenutzte `chat.*`-Texte im Frontend:
  - `chat.searchAssistants`
  - `chat.yesterday`
  - `chat.sourceHuman`
  - `chat.removeConversationConfirm*`
  - `chat.updateRating.ratingHint`
  - `chat.settings.password*`

## 2. Ungenutzte oder fragwürdige Features

Legende: Aufwand S = klein (Stunden), M = mittel (1–2 Tage).

| Komponente | Feature | Belege, dass es ungenutzt/tot ist | Entfernen würde löschen | Risiko / Aufwand | Empfehlung |
|---|---|---|---|---|---|
| Eval | **QA-Katalog-Generierung (RAGAS)** | `ragas` ist in `services/eval/pyproject.toml:39-48` wegen CVEs deaktiviert. Der Import schlägt zur Laufzeit fehl (`qa_catalog/generator/implementation/QACatalogGeneratorTypes.py:25-35`). Die Endpoints `POST /v1/qa-catalog/generator/{upload,catalog,from-gaible-bucket}` und `GET /generator/types` (`qa_catalog/router.py`) ruft das Frontend nie auf, die zugehörigen UI-Texte waren unbenutzt. Die Tests sind per `--ignore` ausgeschlossen (`pyproject.toml:90`). `langchain_community` wird importiert, ist aber keine Abhängigkeit. In Compose zeigt der Eval-File-Store auf `evalbucket` statt auf den REI-S-Bucket. | `qa_catalog/generator/**`, `qa_catalog/logic/{generation,upload}.py`, `qa_catalog/tasks/handle_generate_catalog_task.py`, `qa_catalog/db/crud_data_source_config.py`, die Generierungsteile von `synthetic_qa_pair.py`, `utils/mixed_document_loader.py`, `utils/model_settings/*` (`AZURE_OPENAI_*`-Env), das Paket `llm_eval/file_store/*` mit `boto3`/`boto3-stubs` und die `FILE_STORE_*`-Env (Compose, `.env.example`), die Tabelle `qa_catalog_generator_temp_data_source_config` (Alembic-Migration), die Behandlung des Status `GENERATING` (Frontend `QaCatalogStatusChip`, `QaCatalogDetailPage.tsx`) und die ignorierten Tests; Eval-Spec und `frontend/src/api/generated-eval` neu generieren | M (`models.py` und das Status-Enum sind verflochten; Migration und Client-Regenerierung nötig) | **entfernen** (heute nur kaputte Codepfade und eine kaputte API) oder ausdrücklich parken |
| Eval | `GET /v1/dashboard` | `dashboard/router.py`, `dashboard/logic/get_dashboard_data.py`. Das Frontend instanziiert `EvalClient.dashboard` (`frontend/src/api/state/apiEvalClient.ts:20,35`), ruft `dashboardGetData` aber nie auf. Das Admin-Dashboard nutzt die Backend-`UsagesApi`. Keine Tests. | 2 Dateien, den Endpoint, `DashboardApi` im Client, die README-Zeile in `services/eval/README.md` | S, gering | **entfernen** |
| Eval | `create_llm_query()` / `ChatModelQuery` | `llm_eval/llm_endpoints/plugins/interface.py:112`, `plugins/impl/openai.py:161`, `plugins/impl/azure_openai.py:159`, `llm_eval/llm_query/chat_model_query.py`. Werden nie aufgerufen: Antworten kommen immer von `GaibleAssistantQuery` (`retrieve_answer_task.py`), LLM-Endpoints dienen nur als Judge-Modelle. | 1 Datei, 3 Methoden | S, gering | **unklar**: entfernen, falls „rohes LLM evaluieren“ nicht geplant ist |
| Backend | `ContextExtension` („DEV: Contexts“) | `backend/src/extensions/examples/show-context.ts`, in Produktion registriert (`extensions/module.ts`). Weder E2E noch UI verwenden sie. Ein Admin kann sie einem Assistenten hinzufügen; sie gibt dann nach einem fest eingebauten Sleep von 2 s `context.context` an das LLM. | 1 Datei, i18n `extensions.context` | S, gering | **entfernen** (reines Dev-Werkzeug) |
| Backend | `UserArgsExtension` („DEV: User Args“) | `extensions/examples/user-args.ts`. Wird von `e2e/tests/extension/user-args.spec.ts`, `e2e/tests/utils/helper.ts` und `mock-llm-server.ts` verwendet, ist also eine Test-Fixture, die in Produktion ausgeliefert wird. | – | Die E2E-Tests hängen daran | **behalten**, aber aus `examples` herausnehmen bzw. umbenennen; ggf. nur in Dev/E2E registrieren |
| Backend | Bing-Web-Search-Tool (`bing-web-search`) | `extensions/tools/bing-web-search.ts` nutzt fest `https://api.bing.microsoft.com/v7.0/search` und `mkt=de-DE`. Microsoft hat die Bing Search APIs im August 2025 abgeschaltet (bitte bestätigen), damit funktioniert das Tool nicht mehr. | 1 Datei, die Registrierung, i18n `extensions.bing.*`, die Erwähnung in `docs/roadmap.md` | S; bestehende Assistenten verlieren das Tool | **entfernen** (Brave Search oder MCP decken Websuche ab) |
| Backend | DALL·E-Tools (`dall-e`, `azure-dall-e`) | `extensions/tools/dall-e.ts` (Modelle `dall-e-2`/`dall-e-3`), `azure-dall-e.ts`. Doppeln `gpt-image-1`/`azure-gpt-image-1`. Die DALL·E-Modelle sind bei OpenAI abgekündigt (Datum bitte prüfen). | 2 Dateien, i18n `dalle`/`azureDalle`, Referenzen in Specs (`api.responses.controller.spec.ts`), den Doku-Text zu `BASE_URL` | S; Assistenten, die die Tools nutzen, verlieren sie | **entfernen**, wenn die Abkündigung bestätigt ist, sonst **unklar** |
| Backend | `OpenApiExtension` (`open-api`) mit eigenem „Tools-Server“-Protokoll | `extensions/tools/open-api.ts`, `src/openapi/tools-spec.json`, generierter Client `extensions/tools/generated/**`, Skript `generate-tools` und CI-Schritt. Im Repo gibt es keinen passenden Server (`dev/mcp-tool-as-server` spricht MCP) und keinen E2E-Test. MCP (`mcp-tools.ts`) deckt den Anwendungsfall ab. | Extension, Spec, generierter Client, npm-Skript, CI-Schritt, i18n `extensions.openapi` | S–M; trifft alle, die so einen Tools-Server betreiben | **unklar**, eher entfernen (Nutzung bei Deployments erfragen) |
| Backend | Dynamisches Laden von Extensions aus `node_modules/@gaible/extensions/*` | `extensions/module.ts` (`getDynamicExtensionModules` u. a., ca. 55 Zeilen). Kein solches Paket existiert oder wird referenziert, die Funktion ist undokumentiert. Zur Laufzeit kopiert sie i18n-Dateien nach `dist/localization`. | ca. 55 Zeilen in `module.ts` | S; das ist ein Plugin-Hook | **unklar**: dokumentieren oder entfernen |
| Backend | `PUT /api/buckets/:id/files/:fileId` (`putFile`) | `controllers/files/files.controller.ts`. Wird weder vom Frontend noch von E2E oder dem Confluence-Importer aufgerufen (der löscht und lädt neu hoch). Nur `files.e2e.spec.ts` testet ihn. | Endpoint, den Zweig `fileIdToUpdate` in `domain/files/use-cases/upload-file.ts` samt Spec-Fall, generiertes `putFile` | S; öffentliche Admin-API (API-Key) | **unklar**: behalten, falls er als externe API gilt, sonst entfernen |
| Backend | `GET /api/users/:id` (`getUser`) | `controllers/users/users.controller.ts`. Keine Aufrufer in Frontend oder E2E. Die Query `GetUser` bleibt, weil `get-user-middleware.ts` sie nutzt. | Endpoint, generiertes `getUser` | S, gering | **unklar** (geringer Nutzen, aber harmlose API) |
| Backend | `AzureAISearchExtension` | `extensions/tools/azure-ai-search.ts` fragt einen Azure-AI-Search-Index direkt ab. Herstellerspezifisch; überschneidet sich mit dem Store `azure-ai-search` von REI-S und dem `files`-Tool. | 1 Datei, i18n | S | **unklar** (nur behalten, wenn ein Deployment einen externen Index nutzt) |
| Backend | Spalte `messages."sourcesOriginal"` | Wird nur von der Migration `1750134137266-migrateSourcesToNewFormat.ts` als Backup für deren `down` geschrieben, vom Code nie gelesen (`domain/database/entities/message.ts:59`). | DB-Spalte (neue Migration), Entity-Feld | S; das Backup für den Rückweg der alten Migration geht verloren | **entfernen** |
| Backend | `initSchemaIfNotExistsAndMoveMigrations` (verschiebt `public.migrations` ins Schema) | `domain/database/typeorm.helper.ts` | Kompatibilitäts-Shim für sehr alte Installationen | S | **behalten**, solange nicht sicher ist, dass alle Installationen migriert sind |
| Backend | Alias `LANGFUSE_BASE_URL` neben `LANGFUSE_BASEURL` | `metrics/langfuse.ts:20-21` | 1 Zeile | S | **behalten** (`LANGFUSE_BASE_URL` ist der Name der Langfuse-SDKs) |
| Backend + Frontend | Caddy-Redirects `/blobs/*` und `/auth/*` → `/api…`, markiert mit „TODO remove after the transition“ | `frontend/Caddyfile:9-10`, `dev/Caddyfile:17-19`. Nicht wirklich Legacy: Bild-URLs (`dall-e.ts`, `gpt-image-1.ts`, `gemini-image.ts`) und OAuth-Callbacks (`domain/auth/strategies/*`) werden ohne `/api` gebaut, und alte Nachrichten enthalten `/blobs/`-URLs. | – | Entfernen bricht Bilder und OAuth | **behalten**, TODO-Kommentare korrigieren oder erst die URLs auf `/api/…` umstellen (inkl. Migration alter Nachrichten) |
| REI-S | Store-Typ `dev-null` | `rei_s/config.py`, `vectorstores/devnull_store.py`. Wird nur von Tests genutzt, ist aber in Produktion wählbar. | – | – | **behalten** (Testhilfe, kostet nichts) |
| Frontend | Eigener Fetch in `useEvalAvailability` statt des generierten `EvalApi.getEvalServiceStatus` | `frontend/src/api/state/useEvalAvailability.ts` | – | S | Aufräumen: den generierten Client verwenden |

## 3. Weitere Auffälligkeiten (Bugs/Doku, kein toter Code)

- **`VERSION` erreicht das Backend-Image nicht.**
  - `.github/workflows/release.yaml` übergibt `VERSION`, aber `backend/Dockerfile` hat kein `ARG/ENV VERSION`.
  - Export und Import von Konfigurationen lesen `process.env.VERSION` (`export-configuration.ts`, `import-configuration.ts`).
  - Deshalb melden Release-Images `unknown`, und beim Import gibt es eine unnötige Versionswarnung.
  - Helm setzt `VERSION` ebenfalls nicht.
- **Defekte Root-Skripte.**
  - `generate-specs-reis` in `package.json` ruft `rei_s/generate_open_api.py` auf, das es nicht gibt (richtig wäre `uv run generate-api-spec`).
  - Der Fehler wird durch `|| echo …` verdeckt.
  - `generate-apis` generiert weder die Eval-Spec noch den Eval-Client.
- **Nicht deklarierte Abhängigkeiten im Backend.** `express` (nur Typen) und `@ai-sdk/provider` (`extensions/models/model-tools.ts`) werden nur transitiv aufgelöst.
- **Veraltete Doku.**
  - `backend/docs/plantuml/context.puml` und die daraus erzeugten PNGs zeigen LangChain-Klassen (`AgentExecutor`, `ChatVertexAI`, …); das Backend nutzt das AI SDK.
  - `docs/dependency-reduction.md` nennt `wait-on`/`dotenv` in `e2e/` als Kandidaten, die bereits entfernt sind.
  - Die REI-S-Doku (`docs/Configuration.md`) beschreibt die Embedding-Variablen für Bedrock, NVIDIA, Ollama und OpenAI-kompatibel sowie `FILESIZE_THRESHOLD` nicht.
- **Eval-Spec.** `eval-dev-spec.json` ist nicht im Format von `ruff format` eingecheckt. CI vergleicht nur die beiden frisch formatierten Dateien, daher fällt das nicht auf.

## 4. Geprüft und in Ordnung

- **REI-S:** Alle sechs Routen werden vom Backend-Client genutzt, alle Python-Abhängigkeiten werden verwendet.
- **Helm:** Alle Values werden in Templates verwendet (die eine Ausnahme ist entfernt).
- **Env-Variablen:**
  - Alle Variablen des Backends aus `.env.example` und Compose werden gelesen.
  - Im Frontend werden `VITE_SERVER_URL` und `VITE_VERSION` gelesen.
- **Backend-Endpoints:** Alle übrigen werden vom Frontend, von E2E, vom Confluence-Importer oder extern (`/api/public/assistants/:id/{responses,files}`) genutzt.
- **CQRS-Handler:** Alle übrigen werden dispatcht.
- **Extensions:** Alle übrigen Modell- und Tool-Extensions sind erreichbar. Speech-to-Text und Transcribe-Azure nutzt das Chat-Input.
