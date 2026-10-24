import { randomBytes } from 'node:crypto';
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
 * Every test file gets its own fresh database `<db>_test_<run>_<pid>` (created and dropped in
 * vitest.setup-db.e2e.ts), so the files can run in parallel and in any order and never see data of another file
 * or a previous run. The role in `DB_URL` therefore needs the CREATEDB privilege.
 */
const readDbUrlFromEnvFile = (): string | undefined => {
  const envFile = join(import.meta.dirname, '.env');
  return existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).DB_URL : undefined;
};

const init = (project: TestProject) => {
  process.env.TZ = 'UTC';

  const baseUrl = process.env.DB_URL || readDbUrlFromEnvFile();
  if (!baseUrl) {
    throw new Error(
      'DB_URL is not set. The DB tests need a running postgres: start it with `docker compose up -d postgres` ' +
        'and set DB_URL (e.g. `cp .env.example .env`, default postgres://admin:secret@localhost:5432/gaible).',
    );
  }
  logger.log('using database server from DB_URL');
  const baseName = new URL(baseUrl).pathname.slice(1) || 'postgres';
  const prefix = `${baseName}_test_${randomBytes(4).toString('hex')}_`;
  project.provide('testDbBaseUrl', baseUrl);
  project.provide('testDbPrefix', prefix);

  // drops the databases of files whose worker did not get to drop them (e.g. crashed or cancelled runs)
  return async () => {
    const client = new pg.Client({ connectionString: baseUrl });
    await client.connect();
    try {
      const { rows } = await client.query<{ datname: string }>(`SELECT datname FROM pg_database WHERE starts_with(datname, $1)`, [
        prefix,
      ]);
      for (const { datname } of rows) {
        await client.query(`DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`);
      }
    } finally {
      await client.end();
    }
  };
};

declare module 'vitest' {
  export interface ProvidedContext {
    testDbBaseUrl: string;
    testDbPrefix: string;
  }
}

export default init;
