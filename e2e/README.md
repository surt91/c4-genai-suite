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

`NODE_ENV=development` is required: the backend only registers the test extension `user-args-test`
(`backend/src/extensions/dev-only/`) outside of production.

All tests run against a local mock LLM server (`tests/utils/mock-llm-server.ts`) started by the tests on the host,
so no cloud credentials are needed. The backend container reaches it via `host.docker.internal`.
Only the `chromium` project is configured.

## How to Add or Debug E2Es

The tests run in parallel (`fullyParallel`, 4 workers locally and 3 in CI, override with `--workers=<n>`) against one
shared backend and database. Failed tests are not retried (also not in CI), so a flaky test fails the pipeline right
away; check a new test for flakiness with e.g. `--repeat-each=5`. To keep them independent of each other and of previous runs:

- Use the `test` from [`tests/utils/fixtures.ts`](tests/utils/fixtures.ts) and log in with the `adminUser` fixture
  (`await login(page, adminUser)`): every test gets a fresh admin user, so per-user state like conversations,
  uploaded user files or the password does not collide. `adminApi` is an API context of the initial admin to set up
  data quickly via the REST API (see [`tests/utils/api.ts`](tests/utils/api.ts)).
- Give everything a test creates a unique name (`uniqueName(...)`), inside the test function (not at module level,
  which is shared by repeated runs in the same worker).
- Only assert on the entities the test created (filter by their unique names), never on global lists, counts or the
  first/last row. Do not delete or modify entities the test did not create.
- There may only be one `user` and one `conversation` bucket. They are created by the `setup` project
  ([`tests/global.setup.ts`](tests/global.setup.ts)) and shared by all tests.
- Tests that change global state (e.g. the theme settings) must run in the `chromium-serial` project (see
  `SERIAL_TESTS` in [`playwright.config.ts`](playwright.config.ts)), which runs one test at a time.

The step syntax (look for `.step` in the test files) structures long tests. The tests do not need a clean database,
but you can always restart the stack with one (`docker compose down -v`).

Use playwright's code generator to append to test files: `npx playwright codegen http://localhost:3333/login`.

## Pipeline fails and you don't know why?

The CI uploads the Playwright report, traces, screenshots and videos of failed tests as the `e2e-report` artifact
and prints the container logs. Open traces in the [trace viewer](https://trace.playwright.dev/).
