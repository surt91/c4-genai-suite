# Working with E2E Tests

## Running the E2E Tests

The tests run against the stack from the root [`docker-compose.yml`](../docker-compose.yml), exactly like in CI:

```bash
# in the repository root
REIS_EMBEDDINGS_TYPE=random-test-embeddings NODE_ENV=development docker compose --profile mcp up --build --wait

# in e2e/
npm ci
npx playwright install chromium
export URL=http://localhost:3333 REIS_ENDPOINT=http://reis:3201 MCP_SERVER_ENDPOINT=http://mcp-fetch:8000/sse MOCK_LLM_HOST=host.docker.internal
npx playwright test                                         # all tests
npx playwright test tests/administration/permissions.spec.ts  # a single file
npx playwright test --ui                                    # interactive / debugging
```

All tests run against a local mock LLM server (`tests/utils/mock-llm-server.ts`) started by the tests on the host,
so no cloud credentials are needed. The backend container reaches it via `host.docker.internal`.
Only the `chromium` project is configured.

## How to Add or Debug E2Es

**Many tests depend on the database state**, so tests do not run in parallel and use the step syntax (look for `.step` in the test files).
Restart the stack with a clean database (`docker compose down -v`) if a previous run left unexpected state behind.

Use playwright's code generator to append to test files: `npx playwright codegen http://localhost:3333/login`.

## Pipeline fails and you don't know why?

The CI uploads the Playwright report, traces, screenshots and videos of failed tests as the `e2e-report` artifact
and prints the container logs. Open traces in the [trace viewer](https://trace.playwright.dev/).
