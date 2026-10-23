import * as process from 'node:process';

// Point each jest worker to its own database (created in jest.setup.e2e.ts).
const baseUrl = process.env.GAIBLE_TEST_DB_BASE_URL;
if (baseUrl) {
  const url = new URL(baseUrl);
  const baseName = url.pathname.slice(1) || 'postgres';
  url.pathname = `/${baseName}_test_${process.env.JEST_WORKER_ID ?? '1'}`;
  process.env.DB_URL = url.toString();
}
