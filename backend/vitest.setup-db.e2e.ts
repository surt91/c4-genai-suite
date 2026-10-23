/// <reference types="vite/client" />
import * as process from 'node:process';
import { inject, vi } from 'vitest';

// Point each vitest worker to its own database (created in vitest.setup.e2e.ts).
const url = new URL(inject('testDbBaseUrl'));
const baseName = url.pathname.slice(1) || 'postgres';
url.pathname = `/${baseName}_test_${process.env.VITEST_POOL_ID ?? '1'}`;
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
