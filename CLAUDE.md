# Gaible

Fork of an Apache-2.0 GenAI chat suite. Never (re)introduce names of the upstream project or company;
the only allowed reference is the copyright line in `LICENSE`.

## Layout

- `frontend/` – React + Vite + Mantine, vitest (`npm test`)
- `backend/` – NestJS + TypeORM (Postgres), ESM, vitest (`npm test`, DB tests need `DB_URL` or Docker)
- `services/reis/` – Python/FastAPI RAG server (uv, pytest, ruff, ty)
- `services/eval/` – Python LLM evaluation service (uv, pytest, ruff, alembic)
- `services/confluence-importer/` – Python importer (uv, pytest, ruff, mypy)
- `e2e/` – Playwright tests against the compose stack (see `e2e/README.md`)
- `helm-chart/` – Kubernetes chart (helm unittest, README generated from `values.yaml`)
- `dev/` – helpers for local runs (Caddyfile, example MCP server)
- `docker-compose.yml` – the only way to run the stack; `.github/workflows/` – `ci.yaml`, `release.yaml`

## Rules

- Conventional Commits (`feat:`, `fix:`, `test:`, `ci:`, …); `!`/`BREAKING CHANGE:` for breaking changes.
- Generated code is committed and checked in CI: after API changes run `npm run generate-apis` in the root
  (needs Java), after `values.yaml` changes regenerate the helm README. Never edit `generated*/` by hand.
- Schema changes need a migration (backend: `npm run migration:generate --name=…`, eval: alembic); never edit old migrations.
- Tests must not need cloud credentials (mock LLMs/APIs) and must not be flaky; E2E tests must be parallel-safe
  (unique names, only assert on own data, see `e2e/README.md`).
- Before committing, run lint + tests of each touched component (commands as in `.github/workflows/ci.yaml`).
- Prefer removing dependencies over adding new ones.
