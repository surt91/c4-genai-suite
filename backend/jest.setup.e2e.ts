import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as process from 'node:process';
import { parseEnv } from 'node:util';
import { Logger } from '@nestjs/common';
import { Client } from 'pg';

const logger = new Logger();

/**
 * Provides a PostgreSQL server for the DB-backed `*.e2e.spec.ts` tests.
 *
 * The server is taken from `DB_URL` (environment, or else `backend/.env`), e.g. the compose postgres
 * (`docker compose up -d postgres`) or a postgres service container in CI.
 *
 * Every jest worker gets its own freshly (re)created database `<db>_test_<workerId>` (see
 * jest.setup-db.e2e.ts), so the suites can run in parallel and never see data of a previous run.
 * The role in `DB_URL` therefore needs the CREATEDB privilege.
 */
const readDbUrlFromEnvFile = (): string | undefined => {
  const envFile = join(__dirname, '.env');
  return existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).DB_URL : undefined;
};

const init = async (globalConfig: { maxWorkers: number }) => {
  process.env.TZ = 'UTC';

  const baseUrl = process.env.DB_URL || readDbUrlFromEnvFile();
  if (!baseUrl) {
    throw new Error(
      'DB_URL is not set. The DB tests need a running postgres: start it with `docker compose up -d postgres` ' +
        'and set DB_URL (e.g. `cp .env.example .env`, default postgres://admin:secret@localhost:5432/gaible).',
    );
  }
  logger.log('using database server from DB_URL');
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
