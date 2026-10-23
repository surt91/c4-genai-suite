import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as process from 'node:process';
import { parseEnv } from 'node:util';
import { Logger } from '@nestjs/common';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

const logger = new Logger();

/**
 * Provides a PostgreSQL server for the DB-backed `*.e2e.spec.ts` tests.
 *
 * The server is taken from `DB_URL` (environment, or else `backend/.env`), e.g. the compose postgres
 * (`docker compose up -d postgres`) or a postgres service container in CI.
 *
 * Every vitest worker gets its own freshly (re)created database `<db>_test_<poolId>` (see
 * vitest.setup-db.e2e.ts), so the suites can run in parallel and never see data of a previous run.
 * The role in `DB_URL` therefore needs the CREATEDB privilege.
 */
const readDbUrlFromEnvFile = (): string | undefined => {
  const envFile = join(import.meta.dirname, '.env');
  return existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).DB_URL : undefined;
};

const init = async (project: TestProject) => {
  process.env.TZ = 'UTC';

  const baseUrl = process.env.DB_URL || readDbUrlFromEnvFile();
  if (!baseUrl) {
    throw new Error(
      'DB_URL is not set. The DB tests need a running postgres: start it with `docker compose up -d postgres` ' +
        'and set DB_URL (e.g. `cp .env.example .env`, default postgres://admin:secret@localhost:5432/gaible).',
    );
  }
  logger.log('using database server from DB_URL');
  project.provide('testDbBaseUrl', baseUrl);
  const baseName = new URL(baseUrl).pathname.slice(1) || 'postgres';

  const client = new pg.Client({ connectionString: baseUrl });
  await client.connect();
  try {
    const workers = Math.max(1, project.globalConfig.maxWorkers);
    for (let worker = 1; worker <= workers; worker++) {
      const name = `${baseName}_test_${worker}`;
      await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
};

declare module 'vitest' {
  export interface ProvidedContext {
    testDbBaseUrl: string;
  }
}

export default init;
