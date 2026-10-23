import * as process from 'node:process';
import { Logger } from '@nestjs/common';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { Wait } from 'testcontainers';

const logger = new Logger();

/**
 * Provides a PostgreSQL server for the DB-backed `*.e2e.spec.ts` tests.
 *
 * - If `DB_URL` is set (e.g. a postgres service container in CI), that server is used.
 * - Otherwise a throwaway postgres is started via testcontainers (requires a docker daemon).
 *
 * Every jest worker gets its own freshly (re)created database `<db>_test_<workerId>` (see
 * jest.setup-db.e2e.ts), so the suites can run in parallel and never see data of a previous run.
 * The role in `DB_URL` therefore needs the CREATEDB privilege.
 */
const init = async (globalConfig: { maxWorkers: number }) => {
  process.env.TZ = 'UTC';

  if (process.env.DB_URL) {
    logger.log('using database server from DB_URL');
  } else {
    logger.log('DB_URL not set, spinning up postgres test container');
    const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:17.5-alpine')
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    process.env.DB_URL = container.getConnectionUri();
    // @ts-expect-error setting global to use it in the teardown function
    globalThis.dbContainer = container;
  }

  const baseUrl = process.env.DB_URL;
  process.env.GAIBLE_TEST_DB_BASE_URL = baseUrl;
  const baseName = new URL(baseUrl).pathname.slice(1) || 'postgres';

  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  try {
    const workers = Math.max(1, globalConfig.maxWorkers);
    for (let worker = 1; worker <= workers; worker++) {
      const name = `${baseName}_test_${worker}`;
      await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
};

export default init;
