# Gaible Roadmap – Wettbewerbsvergleich und Empfehlungen

Stand: Oktober 2026. Die Wettbewerberangaben stammen aus der offiziellen Doku, den READMEs und den Changelogs (siehe [Quellen](#5-quellen)).
Was nicht verifiziert werden konnte, ist mit *(unverifiziert)* markiert.

## 1. Zusammenfassung

Gaible ist eine schlanke, selbst gehostete GenAI-Chat-Suite, die auf **Assistenten** aufbaut. Admins stellen Assistenten
aus **Extensions** zusammen (Modell, Tools, MCP, RAG, Prompts). Zur Suite gehören ein eigener RAG-Server (**REI-S**) und
ein **Eval-Service**. Gaibles Stärken liegen bei Governance (Usergruppen, Monatsbudgets, Audit-Log, Dashboard),
Betrieb (Helm, Prometheus, Grafana, OpenTelemetry, Langfuse) und der integrierten Qualitätsmessung (Evals).

LibreChat und Open WebUI haben sich 2026 zu breiten Agenten-Plattformen entwickelt. Sie bieten Skills, Subagents,
Code-Ausführung, Artifacts, Memory, Prompt-Bibliotheken, umfangreiche Konversationsverwaltung, Teilen, Voice-Modi sowie
MCP mit OAuth. Gaibles größte Lücken liegen daher **im Chat-Alltag der Endnutzer** (Suche, Export, Teilen, Ordner,
Prompts) und bei **MCP-Auth bzw. RAG-Qualität** (hybride Suche, Reranking). Die Architektur ist dagegen nicht der Engpass.
Die meisten Lücken lassen sich als Extension oder als kleine Ergänzung in Frontend und Backend schließen.

## 2. Vergleichstabelle

Legende: ✅ vorhanden · ⚠️ teilweise/eingeschränkt · ❌ nicht vorhanden

| Bereich | Feature | Gaible | LibreChat | Open WebUI |
|---|---|---|---|---|
| **Modelle** | Provider | ✅ OpenAI, Azure, Bedrock, Google GenAI, Mistral, NVIDIA, Ollama, OpenAI-kompatibel | ✅ sehr breit inkl. Anthropic nativ, Vertex, OpenRouter u. a. | ⚠️ Ollama + OpenAI-kompatibel (Rest über Pipes/Proxy) |
| | Modellwechsel im Chat | ⚠️ über die Wahl des Assistenten, je Assistent mehrere Modelle möglich | ✅ Presets, Model Specs | ✅ inkl. mehrerer Modelle parallel |
| | Reasoning-Anzeige | ✅ | ✅ | ✅ |
| **Agenten & Tools** | Assistenten/Agenten (no-code) | ✅ nur Admins (Extensions, Usergruppen-Freigabe) | ✅ Agent Builder, Marketplace, Skills, Subagents, Agent-Teams | ✅ Workspace-Modelle, Tools, Functions, Skills |
| | Externer Agent-Executor | ❌ (entfernt) | ⚠️ Subagents intern | ⚠️ Pipes |
| | OpenAPI-Tools | ✅ | ✅ Actions | ✅ OpenAPI-Toolserver |
| | Human-in-the-loop (Bestätigung/Formulare) | ✅ Confirm/Input-UI für Extensions | ✅ seit v0.8.8-rc2 *(Pre-Release)* | ⚠️ *(unverifiziert)* |
| **MCP** | Transporte | ⚠️ SSE + Streamable HTTP, stdio nur über Proxy | ✅ stdio, SSE, Streamable HTTP, WebSocket | ⚠️ nur Streamable HTTP (stdio über mcpo) |
| | OAuth für MCP | ❌ nur statische Header | ✅ `requiresOAuth`, Auto-Detection | ✅ OAuth 2.1 (DCR + statisch) |
| | Tool-Feinsteuerung je Tool | ✅ aktivieren/deaktivieren, Beschreibung, Admin- und User-Argumente | ⚠️ | ⚠️ |
| **Ausführung & Ausgabe** | Code-Interpreter | ❌ | ✅ Sandbox-API (gehostet/Enterprise; Self-Hosting unklar) | ✅ Pyodide/Jupyter (Legacy), Open Terminal |
| | Artifacts/Canvas | ❌ (Markdown + KaTeX) | ✅ React/HTML/Mermaid | ✅ HTML/SVG/JS |
| | Bildgenerierung | ✅ DALL·E, GPT-Image-1 (auch Azure), Gemini | ✅ GPT-Image-1, SD, Flux, MCP | ✅ DALL·E, Gemini, ComfyUI, A1111, Bearbeitung |
| **Websuche** | Provider | ⚠️ Brave, Bing Web Search API (Grounding und DuckDuckGo entfernt) | ✅ mehrere Provider, Scraper, Reranker | ✅ dutzende Provider inkl. SearXNG |
| **RAG** | Dokumentformate | ✅ PDF, Office, LibreOffice, Outlook, HTML, Code, JSON/YAML/XML, Audio/Video-Transkription | ✅ | ✅ mehrere Extractors |
| | Vektor-Stores | ⚠️ pgvector, Azure AI Search | ⚠️ pgvector (RAG API) | ✅ 9 Stores |
| | Hybride Suche / Reranking | ⚠️ hybrid nur mit Azure AI Search, kein Reranker | ⚠️ semantisch; Reranker bei Websuche *(RAG-Hybrid unverifiziert)* | ✅ BM25 + Vektor, Reranking |
| | Zitate/Quellen mit Chunk-Vorschau | ✅ | ✅ | ✅ |
| | Wissensbasen (Admin-Buckets) + User-Uploads | ✅ Buckets, User-Buckets, Filter | ✅ | ✅ Knowledge |
| | Full-Context-Modus | ✅ `files-whole` | ⚠️ | ✅ |
| **Voice & Multimodal** | STT | ✅ Browser, Azure Transcribe, Whisper | ✅ inkl. Hands-free | ✅ |
| | TTS / Realtime-Voice | ❌ | ✅ TTS (OpenAI, Azure, ElevenLabs) | ✅ Voice- und Video-Calls, Realtime |
| | Bild-Input (Vision) | ✅ `files-vision` | ✅ | ✅ |
| **Personalisierung** | Memory | ❌ | ✅ Memory-Agent, opt-in | ✅ |
| | Prompt-Bibliothek | ❌ | ✅ | ✅ Slash-Commands, Variablen, Versionierung |
| | User-Werte je Assistent | ✅ User-Argumente | ⚠️ | ⚠️ Valves |
| **Konversationen** | Bearbeiten/Neu generieren | ✅ | ✅ inkl. Branching | ✅ |
| | Branching/Forking | ⚠️ nur Duplizieren | ✅ | ✅ |
| | Suche in Chats | ❌ | ✅ in Nachrichten | ✅ |
| | Ordner/Tags/Pins/Projekte | ❌ | ✅ Projekte (v0.8.7) | ✅ |
| | Export/Import | ❌ (nur Assistenten-Export/Import) | ✅ JSON, MD, Text, Screenshot | ✅ |
| | Teilen (Links) | ❌ | ✅ Read-only-Snapshot, QR, Widerruf | ✅ Link/Community, RBAC |
| | Temporäre Chats | ❌ | ✅ *(Doku nicht gefunden)* | ✅ *(unverifiziert)* |
| | Bewertung (Daumen + Kommentar) | ✅ | ⚠️ | ✅ inkl. Arena/ELO |
| | Kontext-Komprimierung | ✅ Zusammenfassung des Verlaufs | ✅ On-demand-Compaction | ⚠️ |
| **Kollaboration** | Team-Räume | ❌ | ⚠️ Agent-Sharing | ✅ Channels, Notes |
| **Admin & Governance** | Rollen/Gruppen | ✅ Usergruppen, Assistenten-Freigabe je Gruppe | ✅ Rollen, Gruppen, Berechtigungen | ✅ RBAC je Ressource |
| | SSO | ⚠️ Microsoft (Entra), Google, GitHub, generisches OAuth2, Gruppen-Mapping | ✅ OIDC, OAuth2, LDAP, SAML | ✅ OAuth/OIDC, LDAP, Trusted Header |
| | SCIM | ❌ | ❌ *(unverifiziert)* | ✅ SCIM 2.0 |
| | Nutzungslimits | ✅ Monatsbudget je Usergruppe (aktuell nur erste Gruppe) | ✅ Token-Balance mit Auto-Refill | ❌ nativ (nur Analytics/Throttling) |
| | Kostentracking | ⚠️ Token je Nutzer/Assistent, keine Preise | ✅ Token-Spend | ⚠️ Tokens, Kosten manuell |
| | Audit-Log | ✅ | ⚠️ *(unverifiziert)* | ⚠️ *(unverifiziert)* |
| | Dashboard | ✅ Tokens, Nachrichten, Nutzer, Ratings | ⚠️ | ✅ Analytics |
| | Branding/Theme | ✅ Logo, Farben, Footer | ⚠️ | ⚠️ Lizenz verlangt Open-WebUI-Branding |
| **Qualität** | LLM-Evaluation | ✅ QA-Kataloge, Metriken, Assistenten als Ziel | ❌ | ⚠️ Arena/ELO (kein QA-Eval) |
| **Betrieb** | Observability | ✅ Prometheus, Grafana-Dashboards, OTel, Langfuse | ✅ OTel, Langfuse | ✅ OTel |
| | Deployment | ✅ Compose, Helm (NetworkPolicies, ServiceMonitors) | ✅ Compose, Helm, 1-Click | ✅ Docker, K8s |
| **API & Erweiterung** | OpenAI-kompatible API | ⚠️ Responses-artige API je Assistent (`/public/assistants/:id/responses`), API-Keys | ✅ Agents-API (Chat Completions + Responses, Beta) | ✅ |
| | Plugins | ✅ TypeScript-Extensions, MCP | ✅ Plugins (experimentell), Skills | ✅ Functions/Pipelines, Community-Hub |
| | Webhooks | ❌ | ⚠️ | ✅ |
| **Client** | i18n | ⚠️ DE, EN | ✅ ca. 30 Sprachen | ✅ viele |
| | PWA/Mobile | ⚠️ responsive, kein PWA-Manifest *(nicht geprüft)* | ⚠️ | ✅ PWA |
| | Lizenz | ✅ Apache-2.0 | ✅ MIT | ⚠️ eigene Lizenz mit Branding-Pflicht |

Am Rande: **AnythingLLM** (MIT) setzt auf Workspaces, einen No-Code-Agent-Builder, zeitgesteuerte Agenten (Cron), MCP,
viele Vektor-DBs und ein einbettbares Chat-Widget. **LobeChat** firmiert inzwischen als **LobeHub** („Chief Agent
Operator“). Es bietet Agent-Gruppen, Workspaces, mehr als 10.000 Tools bzw. MCP-Plugins und eine Community-Lizenz.

## 3. Stärken und Lücken von Gaible

**Stärken**
- **Assistenten-Modell mit Extensions**: Admins kuratieren, was Nutzer bekommen. Freigabe je Usergruppe,
  Duplizieren, Export/Import. Das passt gut zu Organisationen mit Compliance-Anforderungen.
- **Governance ab Werk**: Monatsbudgets je Gruppe (Open WebUI hat das nicht nativ), Audit-Log, Dashboard, Login-Beschränkung
  auf IdP-Gruppen.
- **Eigene RAG-Pipeline (REI-S)** mit breiter Format-Unterstützung (inkl. Outlook und Video), Quellen mit Chunk-Vorschau,
  Filtern und einem MCP-Endpunkt.
- **Integrierte Evals**: QA-Kataloge, Metriken und Assistenten als Ziel. Das hat kein Wettbewerber in dieser Form.
- **Betrieb**: Helm-Chart mit NetworkPolicies, PrometheusRules, ServiceMonitors und Grafana-Dashboard. Dazu Langfuse und OTel.
- **Feingranulare MCP-Tool-Konfiguration** (je Tool aktivierbar, Admin- und User-Argumente, `{{var}}`-Platzhalter).
- **Schlanke Codebasis** und Apache-2.0 ohne Branding-Pflicht.

**Lücken (nach Gewicht)**
1. Konversationsverwaltung: keine Suche, kein Export, keine Ordner/Pins, keine temporären Chats, kein Teilen.
2. MCP: kein OAuth (Nutzer können sich nicht mit eigenem Konto bei z. B. Atlassian oder GitHub anmelden), stdio nur über einen Proxy.
3. RAG-Qualität mit pgvector: keine hybride Suche, kein Reranking.
4. Websuche: Nach der Entfernung von Grounding und DuckDuckGo bleiben nur kommerzielle APIs. Ein Self-Hosting-Provider wie SearXNG und ein Fetch-/Scrape-Tool fehlen.
5. Keine Prompt-Bibliothek, kein Memory.
6. Ausgabe: kein Code-Interpreter, keine Artifacts, kein Mermaid.
7. Kein TTS bzw. Voice-Modus. Nur DE/EN. Kein SCIM/LDAP/OIDC-Discovery. Keine Kosten in Währung.
8. Dokumentation hinkt hinterher: Laut README wird nur SSE unterstützt, Streamable HTTP ist aber implementiert.

## 4. Priorisierte Empfehlungen

Leitlinie: Neue Funktionen sollen sich ins Modell aus **Assistent, Extension und REI-S** fügen. Neue Infrastruktur
(Sandboxes, Realtime-Server, zusätzliche Datenbanken) sollte möglichst vermieden werden.
Aufwand: S ≈ Tage, M ≈ 1–3 Wochen, L ≈ mehr als 1 Monat.

### Als Nächstes

| # | Was | Warum | Aufwand | Komponenten |
|---|---|---|---|---|
| 1 | **MCP-OAuth 2.1 je Nutzer** (Authorization Code + PKCE, DCR und statische Clients, verschlüsselte Token je User/Extension, Re-Auth-Hinweis im Chat). Zusätzlich README auf Streamable HTTP aktualisieren. | Erst damit werden Unternehmens-MCP-Server (Atlassian, GitHub, M365, interne Dienste) mit Nutzerrechten statt Service-Account nutzbar. Beide Wettbewerber haben das bereits, es ist Grundvoraussetzung für Enterprise-MCP. Passt direkt zur `mcp`-Extension und zu den vorhandenen User-Werten. | M | backend, frontend |
| 2 | **Konversationsverwaltung**: Volltextsuche (Postgres FTS), Pins, Export als Markdown/JSON, temporäre Chats (nicht gespeichert, z. B. per Assistent erzwingbar). | Höchster Alltagsnutzen bei geringem Risiko. Wird von Nutzern als selbstverständlich erwartet. Temporäre Chats sind außerdem ein Datenschutz-Argument (DSGVO). | S–M | backend (Migration), frontend |
| 3 | **Hybride Suche + optionales Reranking in REI-S für pgvector** (Postgres `tsvector` + Vektor, RRF-Fusion; Reranker als konfigurierbarer Endpoint, z. B. Cohere-/Jina-/TEI-kompatibel). Messbar über die Eval-Kataloge. | RAG ist Gaibles Kern. Hybride Suche verbessert Treffer bei Fachbegriffen, Artikelnummern und Namen deutlich, ganz ohne neue Datenbank. Die Evals belegen den Effekt, das ist ein eigenes Verkaufsargument. | M | REI-S, backend (Extension-Option), eval |
| 4 | **Prompt-Bibliothek** mit `{{var}}`-Platzhaltern: persönliche und von Admins für Gruppen freigegebene Vorlagen, Aufruf per `/` im Chat-Input, Formular für die Variablen. | Kleiner Aufwand mit großem Nutzen für Einsteiger. Nutzt die gerade vereinfachte Platzhalter-Syntax wieder. Admins können Best Practices verteilen. | S–M | backend, frontend |
| 5 | **Self-hosted Websuche**: SearXNG-Extension sowie eine generische „Web-Fetch“-Extension (URL abrufen, HTML→Markdown über den REI-S-HTML-Provider). | Seit dem Wegfall von Grounding und DuckDuckGo fehlt eine Option ohne Cloud-Konto. Für ein Self-Hosting-Produkt ist das wichtig (Datensouveränität). Aufwand gering, denn Brave dient als Vorlage. | S | backend |

### Mittelfristig

| Was | Warum | Aufwand | Komponenten |
|---|---|---|---|
| **Teilen von Konversationen** als Read-only-Snapshot innerhalb der Instanz (Link, Widerruf, optional „in eigene Chats kopieren“) | Wissensaustausch im Team. Das Duplizieren ist bereits vorhanden und kann wiederverwendet werden. Audit-Log-Eintrag je Freigabe. | M | backend, frontend |
| **Kosten in Währung**: Preis je Modell-Extension (Input/Output pro 1M Tokens), Kosten im Dashboard, Budgets optional in € statt Tokens. Dazu den Bug „Quota nur für erste Usergruppe“ beheben (z. B. Maximum aller Gruppen). | Controller fragen nach €, nicht nach Tokens. Die Datenbasis existiert bereits (Usages). | S–M | backend, frontend |
| **Mermaid + HTML/SVG-Artifacts** (Sandbox-iframe, Seitenpanel) | Diagramme und Prototypen sind ein häufiger Anwendungsfall. Mermaid allein ist S. | S (Mermaid) / M (Artifacts) | frontend |
| **Ordner/Projekte** für Konversationen, optional mit eigenem Datei-Bucket (User-Bucket je Projekt) | Lange Arbeiten an einem Thema. REI-S-Buckets lassen sich wiederverwenden. | M | backend, frontend, REI-S |
| **Eval-Vergleich & Regressionen** (Side-by-Side, Auto-Eval bei Assistenten-Änderung) | Schärft das Alleinstellungsmerkmal. Steht bereits in `services/eval/ROADMAP.md`. | M | eval, frontend |
| **Memory als Extension** (opt-in, Nutzer sieht und löscht Einträge, Admin aktiviert je Assistent) | Personalisierung wie bei der Konkurrenz. Als Extension bleibt sie abschaltbar und auditierbar. | M | backend, frontend |
| **OpenAI-kompatibles Chat-Completions-API** je Assistent (zusätzlich zur Responses-API), `model` = Assistent | So lassen sich IDEs, n8n, Open-Source-Clients und Skripte gegen kuratierte Assistenten mit RAG und Tools anbinden. | S–M | backend |
| **OIDC mit Discovery** (statt manueller URLs), optional LDAP | Vereinfacht Keycloak- und Authentik-Setups, die bei Self-Hosting typisch sind. | S | backend |
| **PWA-Manifest**, Barrierefreiheits-Audit (axe in E2E) | Günstig, sinnvoll für den Mobile-Einsatz und für öffentliche Auftraggeber (BITV). | S | frontend, e2e |

### Später / Ideen

- **Code-Ausführung über MCP** statt eingebaut: Einen Sandbox-MCP-Server (z. B. Container oder Jupyter-Kernel) als Compose-Profil
  bzw. Helm-Option dokumentieren. Die Codebasis bleibt schlank, Dateiausgabe läuft über Blobs. (M)
- **TTS und Voice-Modus** (TTS-Extension analog zu Speech-to-Text; Realtime erst später). (M/L)
- **Nutzer-eigene Assistenten** mit Berechtigung je Gruppe (Admins geben erlaubte Extensions frei). Gleicht das No-Code-Agent-Feature der Konkurrenz an, ohne die Governance aufzugeben. (L)
- **Skills** (`SKILL.md`-Bundles) als Extension-Typ. Vorher beobachten, wie stabil das Konzept bei LibreChat ist. (M)
- **SCIM 2.0** für User- und Gruppen-Provisionierung (Gruppen-Mapping aus dem IdP existiert bereits). (M)
- **Weitere Sprachen** (FR, IT, ES zuerst). Die i18n-Struktur ist vorhanden. (S je Sprache)
- **Webhooks bzw. Ereignisse** (Budget erreicht, neue Nutzer) und **Admin-Banner**. (S)
- **Einbettbares Chat-Widget** für einen Assistenten (wie bei AnythingLLM). Nutzt die öffentliche Assistenten-API. (M)
- **Weitere Vektor-Stores** nur bei konkretem Bedarf (z. B. Qdrant oder OpenSearch). pgvector mit Hybrid-Suche deckt die meisten Fälle ab.

## 5. Quellen

- LibreChat README: <https://github.com/danny-avila/LibreChat>
- LibreChat MCP-Server-Konfiguration: <https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/mcp_servers>
- LibreChat Memory: <https://librechat.ai/docs/configuration/librechat_yaml/object_structure/memory>
- LibreChat Code Interpreter: <https://www.librechat.ai/docs/features/code_interpreter>, Self-Hosting-Diskussion <https://github.com/danny-avila/LibreChat/discussions/9445>
- LibreChat Agents API: <https://www.librechat.ai/docs/features/agents_api>
- LibreChat Shareable Links: <https://www.librechat.ai/docs/features/shareable_links>
- LibreChat RAG API: <https://www.librechat.ai/docs/features/rag_api>
- LibreChat Balance: <https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/balance>
- LibreChat SAML: <https://www.librechat.ai/pt-BR/docs/configuration/authentication/SAML>
- LibreChat Changelogs v0.8.6–v0.8.8: <https://www.librechat.ai/changelog/v0.8.7>, <https://www.librechat.ai/changelog/v0.8.8-rc2>
- Open WebUI README: <https://github.com/open-webui/open-webui>
- Open WebUI Features: <https://docs.openwebui.com/features/>
- Open WebUI MCP: <https://docs.openwebui.com/features/extensibility/mcp>
- Open WebUI Code Execution: <https://docs.openwebui.com/features/chat-conversations/chat-features/code-execution/python>
- Open WebUI Artifacts: <https://docs.openwebui.com/features/chat-conversations/chat-features/code-execution/artifacts>
- Open WebUI Chat Sharing: <https://docs.openwebui.com/features/chat-conversations/chat-features/chatshare>
- Open WebUI Analytics: <https://docs.openwebui.com/features/administration/analytics/>
- AnythingLLM README: <https://github.com/Mintplex-Labs/anything-llm>
- LobeHub (LobeChat) README: <https://github.com/lobehub/lobe-chat>
- Gaible: `README.md`, `backend/src/extensions/**`, `backend/src/domain/**`, `frontend/src/pages/**`, `services/reis`, `services/eval/ROADMAP.md`, `helm-chart/`
