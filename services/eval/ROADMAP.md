# Roadmap

High-level status of the LLM Eval service integration into Gaible.
This is ongoing development — items here are the broad strokes, not a detailed task list.

## Core integration

- [x] Eval service runs as an internal trusted service behind the Gaible backend proxy
- [x] Service-to-service auth (API key) for eval → Gaible callbacks
- [x] Shared PostgreSQL with dedicated `llm_eval` schema
- [x] OpenAPI spec + generated frontend API client
- [x] CI workflow, container image build & release

## Features

- [x] QA Catalogs — list, CRUD, upload/download, versioning
- [x] LLM Endpoints — list, CRUD (eval models only)
- [x] Metrics — list, CRUD, detail page (4 metric types)
- [x] Evaluations — create wizard, list, detail, results, CSV export
- [x] Gaible Assistants directly selectable as evaluation targets
- [ ] Admin docs in Gaible evals dashboard
- [ ] Dashboard — statistics, recent evaluations, quick stats _(in progress)_
- [ ] QA Catalog generation UI (RAGAS / Gaible bucket) _(deferred)_
- [ ] Evaluation comparison (side-by-side, regressions)
