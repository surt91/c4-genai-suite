# Developers Guide

## Prerequisites

- **Docker** with Compose v2 – runs the whole stack and the infrastructure (Postgres/pgvector, S3Mock).
- **Node.js** in the version from `.nvmrc` (we recommend `nvm install`).
- **uv** (>= 0.5) for the Python services ([installation guide](https://docs.astral.sh/uv/getting-started/installation/)); uv manages the Python version itself.
- **JRE** – only needed when changing APIs, to run the OpenAPI generator.

Run `npm install` in the repository root once. It installs the git hooks (husky + lint-staged);
`npm run install-all` additionally installs the dependencies of backend, frontend and REI-S.

## Running the stack

There is exactly one way to start Gaible: the root [`docker-compose.yml`](docker-compose.yml).

```bash
docker compose up --build          # http://localhost:3333, login admin@example.com / secret
```

See the [README](README.md#using-docker-compose) for the optional profiles (`ollama`, `mcp`, `eval`).

### Hot reload while developing

Start only the infrastructure from the same Compose file and run the component you are working on natively:

```bash
docker compose up -d postgres s3 reis

cd backend && cp .env.example .env && npm run start:dev    # http://localhost:3000
cd frontend && cp .env.example .env && npm run dev         # http://localhost:5173 (proxies to the backend)
cd services/reis && cp .env.example .env && uv run fastapi dev rei_s/app.py --port 3201   # after `docker compose stop reis`
```

The `.env.example` files contain working defaults for this setup.

## Tests

| Component  | Command (from the component directory)                 | Needs                        |
| ---------- | ------------------------------------------------------ | ---------------------------- |
| frontend   | `npm test`                                             | –                            |
| backend    | `npm test`                                             | Postgres (`DB_URL`)          |
| REI-S      | `uv run pytest`                                        | Postgres + S3 (S3Mock) for some tests |
| eval       | `uv run pytest`                                        | Postgres                     |
| e2e        | `npx playwright test`                                  | running stack (see below)    |

The Postgres/S3 tests use the Compose services (`docker compose up -d postgres s3`); the backend takes the server from
`DB_URL` (environment or `backend/.env`) and creates one database per jest worker.
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

GitHub Actions ([`.github/workflows/ci.yaml`](.github/workflows/ci.yaml)) runs one job per component (lint, build, tests)
plus the E2E tests on every pull request and on `main`. [`release.yaml`](.github/workflows/release.yaml) publishes
container images on every push to `main` and, via release-please, versioned releases and the Helm chart.
Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Main Building Blocks

The application consists of a **Frontend** (`/frontend`), a **Backend** (`/backend`), and a **REI-S** (`/services/reis`) service.

## Building Block Interaction

The basic interaction between the frontend, backend, and REI-S service is as follows:

1. **Frontend**: The user interacts with the frontend, which sends requests to the backend.
2. **Backend**: The backend processes these requests, handles user authentication, and communicates with the REI-S service for file indexing and retrieval.
3. **REI-S Service**: The REI-S service indexes files and provides search capabilities, returning results to the backend, which then feeds them to the LLM and sends the generated answer to the frontend for display.

The interfaces between the Frontend > Backend > REI-S service are defined using OpenAPI specifications. The specs are generated using OpenAPI generators. These specifications itself allow for automatic generation of TypeScript API files ensuring type safety and consistency across the application.

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
2. the TypeScript API files in the frontend.

Within the `/backend` folder:

```bash
# re-generate backend-dev-spec.json
npm run generate-openapi-dev
```

... and then in `/frontend` folder:

```bash
npm run generate-api
```

### REI-S REST-API

The backend communicates with the REI-S service using Python client files generated from the OpenAPI specification. If you change the REI-S API, you need to regenerate

1. the OpenAPI specification for the REI-S service and
2. the TypeScript API files in the frontend.

Within the `/services/reis` folder:

```bash
# re-generate reis-dev-spec.json
uv run python rei_s/generate_open_api.py
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
