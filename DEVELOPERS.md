# Developers Guide

## Prerequisites

- **Docker** with Compose v2 – runs the whole stack and the infrastructure (Postgres/pgvector, S3Mock).
- **Node.js** in the version from `.nvmrc` (we recommend `nvm install`).
- **uv** (>= 0.5) for the Python services ([installation guide](https://docs.astral.sh/uv/getting-started/installation/)); uv manages the Python version itself.

Run `npm install` in the repository root once. It installs the git hooks (husky + lint-staged);
`npm run install-all` additionally installs the dependencies of backend, frontend and REI-S.

## Running the stack

There is exactly one way to start Gaible: the root [`docker-compose.yml`](docker-compose.yml).

```bash
docker compose up --build          # http://localhost:3333, login admin@example.com / secret
```

See the [README](README.md#docker-compose) for the optional profiles (`ollama`, `mcp`, `eval`).

### Hot reload while developing

Start only the infrastructure from the same Compose file and run the component you are working on natively:

```bash
docker compose up -d postgres s3 reis

cd backend && cp .env.example .env && npm run start:dev    # http://localhost:3000
cd frontend && cp .env.example .env && npm run dev         # http://localhost:5173 (proxies to the backend)
cd services/reis && cp .env.example .env && uv run fastapi dev rei_s/app.py --port 3201   # after `docker compose stop reis`
```

The `.env.example` files contain working defaults for this setup.
Except for the frontend (3333), the Compose ports are only published on `127.0.0.1`, so the infrastructure (and REI-S,
which has no authentication) is not reachable from other hosts.

## Tests

| Component | Command (from the component directory) | Needs                                 |
| --------- | -------------------------------------- | ------------------------------------- |
| frontend  | `npm test`                             | –                                     |
| backend   | `npm test`                             | Postgres (`DB_URL`)                   |
| REI-S     | `uv run pytest`                        | Postgres + S3 (S3Mock) for some tests |
| eval      | `uv run pytest`                        | Postgres                              |
| e2e       | `npx playwright test`                  | running stack (see below)             |

The Postgres/S3 tests use the Compose services (`docker compose up -d postgres s3`); the backend takes the server from
`DB_URL` (environment or `backend/.env`) and creates one database per vitest worker.
No test requires credentials for external services; LLMs are replaced by a mock server.

### E2E tests

The E2E tests run against the Compose stack, exactly like in CI:

```bash
REIS_EMBEDDINGS_TYPE=random-test-embeddings NODE_ENV=development docker compose --profile mcp up --build --wait
cd e2e && npm ci && npx playwright install chromium
URL=http://localhost:3333 REIS_ENDPOINT=http://reis:3201 MCP_SERVER_ENDPOINT=http://mcp-fetch:8000/sse \
  MOCK_LLM_HOST=host.docker.internal npx playwright test
```

Use `npx playwright test --ui` or the Playwright VS Code extension to debug single tests.

### CI

All changes land on `main` via pull requests. GitHub Actions ([`.github/workflows/ci.yaml`](.github/workflows/ci.yaml))
runs one job per component (lint, build, tests) plus the E2E tests on every pull request. The job `ci-passed` sums
them up and is the only required status check: `main` is protected and only accepts pull requests whose checks passed and that are up to date with `main`, so `main` itself is not tested again.
[`release.yaml`](.github/workflows/release.yaml) publishes container images (`main`, `commit-<sha>`) on every push to
`main` and maintains a release pull request via release-please. Merging that pull request creates the GitHub release,
the versioned multi-arch images (`1.2.3`, `v1.2.3`, `latest`) and pushes the Helm chart.
Commit messages (and squash-merged pull request titles) must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Main Building Blocks

The application consists of a **Frontend** (`/frontend`), a **Backend** (`/backend`), and a **REI-S** (`/services/reis`) service.

## Building Block Interaction

The basic interaction between the frontend, backend, and REI-S service is as follows:

1. **Frontend**: The user interacts with the frontend, which sends requests to the backend.
2. **Backend**: The backend processes these requests, handles user authentication, and communicates with the REI-S service for file indexing and retrieval.
3. **REI-S Service**: The REI-S service indexes files and provides search capabilities, returning results to the backend, which then feeds them to the LLM and sends the generated answer to the frontend for display.

The interfaces between the Frontend > Backend > REI-S service (and Frontend > eval service) are defined using OpenAPI specifications, which are generated from the code. The TypeScript API clients are generated from these specifications with [`@hey-api/openapi-ts`](https://heyapi.dev) (pure Node.js, configured in `frontend/openapi-ts.config.ts` and `backend/openapi-ts.config.ts`). The generated code is committed; CI checks that it is up to date.

For convenience you can run the following command in the root to regenerate all specs and apis (Frontend->Backend and Backend->REI-S)

```bash
# Regenerate all OpenAPI specs and TypeScript API files
npm run generate-apis
```

Before generating the APIs, ensure all dependencies are installed by running either `npm run install-all` or running `npm install` manually in frontend, backend and all service subdirectories.

Some more details on the OpenAPI specifications and how to regenerate them are provided below.

### Backend REST-API

The frontend communicates with the backend using TypeScript API files generated from the OpenAPI specification. If you change the backend API, you need to regenerate

1. the OpenAPI specification for the backend and
2. the TypeScript API clients in the frontend.

Within the `/backend` folder:

```bash
# re-generate backend-dev-spec.json
npm run generate-openapi-dev
```

... and then in `/frontend` folder:

```bash
# re-generates src/api/generated (backend) and src/api/generated-eval (eval service)
npm run generate-api
```

### REI-S REST-API

The backend communicates with the REI-S service using a TypeScript API client generated from the OpenAPI specification. If you change the REI-S API, you need to regenerate

1. the OpenAPI specification for the REI-S service and
2. the TypeScript API client in the backend.

Within the `/services/reis` folder:

```bash
# re-generate reis-dev-spec.json
uv run generate-api-spec
```

... and then in `/backend` folder:

```bash
npm run generate-reis
```

## Development Hints

### Adjust Line Endings (for Windows Users)

To ensure proper line endings, configure Git:

```
git config --global core.autocrlf input
```
