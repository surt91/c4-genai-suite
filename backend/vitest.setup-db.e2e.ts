/// <reference types="vite/client" />
import * as process from 'node:process';
import pg from 'pg';
import { afterAll, inject, vi } from 'vitest';

// Every test file gets its own fresh database (see vitest.setup.e2e.ts), so that the files do not depend on the data,
// the sequences or the order of the files that ran before in the same worker. Creating it (and running the
// migrations when the app starts) takes only a fraction of a second.
const serverUrl = inject('testDbBaseUrl');
const database = `${inject('testDbPrefix')}${process.pid}`;

async function onServer(sql: string) {
  const client = new pg.Client({ connectionString: serverUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

await onServer(`CREATE DATABASE "${database}"`);
// Registered first, so it runs after the afterAll hooks of the test file. FORCE closes the connections of anything
// that the test file left running, so that it cannot outlive the file.
afterAll(() => onServer(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`));

const url = new URL(serverUrl);
url.pathname = `/${database}`;
process.env.DB_URL = url.toString();
process.env.TZ = 'UTC';

// TypeORM imports the entity and migration files from the globs itself, which bypasses vitest's module graph (and
// its TypeScript transform). Pass the classes imported through vitest instead.
vi.mock('./src/domain/database/typeorm-sources.js', () => {
  const classes = (modules: Record<string, unknown>) =>
    Object.values(modules).flatMap((module) =>
      Object.values(module as Record<string, unknown>).filter((value) => typeof value === 'function'),
    );
  return {
    entities: classes(import.meta.glob('./src/domain/database/entities/*.ts', { eager: true })),
    migrations: classes(import.meta.glob('./src/migrations/*.ts', { eager: true })),
  };
});
