import { APIRequestContext, test as base } from '@playwright/test';
import { createUserViaApi, newAdminApiContext, TestUser } from './api';
import { startMockLLMServer } from './mock-llm-server';

export { expect } from '@playwright/test';

interface WorkerFixtures {
  // URL of the mock LLM server of this worker.
  mockServerUrl: string;
  // API context logged in as the initial admin, used to set up test data.
  adminApi: APIRequestContext;
}

interface TestFixtures {
  // A fresh admin user for each test. Tests log in with this user instead of the shared initial admin,
  // so that per-user state (conversations, user files, selected assistant, password, ...) does not collide
  // between tests running in parallel.
  adminUser: TestUser;
}

// Base port for mock LLM servers - each worker gets its own port (basePort + workerIndex)
const MOCK_LLM_BASE_PORT = 4100;

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped fixture - starts once per worker, shared across all tests in that worker
  mockServerUrl: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      // Each worker gets a unique port to allow parallel execution (workerIndex is unique within a run)
      const port = MOCK_LLM_BASE_PORT + workerInfo.workerIndex;
      const mockServer = await startMockLLMServer(port);
      console.log(`[Fixture] Mock LLM server started at ${mockServer.url} (worker ${workerInfo.workerIndex})`);

      await use(mockServer.url);

      mockServer.close();
      console.log(`[Fixture] Mock LLM server stopped (worker ${workerInfo.workerIndex})`);
    },
    { scope: 'worker' },
  ],

  adminApi: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const api = await newAdminApiContext();
      await use(api);
      await api.dispose();
    },
    { scope: 'worker' },
  ],

  adminUser: async ({ adminApi }, use) => {
    await use(await createUserViaApi(adminApi, { prefix: 'e2e-admin' }));
  },
});
