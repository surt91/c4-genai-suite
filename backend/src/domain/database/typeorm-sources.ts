import { join } from 'node:path';

// TypeORM loads the compiled entities and migrations itself (the tests replace these globs, see vitest.setup-db.e2e.ts).
const root = join(import.meta.dirname, '..', '..');

export const entities = [join(root, 'domain', 'database', 'entities', '*.js')];

export const migrations = [join(root, 'migrations', '*.js')];
