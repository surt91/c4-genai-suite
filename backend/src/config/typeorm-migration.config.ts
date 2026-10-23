import * as path from 'path';
import { DataSource } from 'typeorm';
import { initSchemaIfNotExistsAndMoveMigrations, schema } from '../domain/database/typeorm.helper';

try {
  process.loadEnvFile();
} catch {
  // no .env file, use the environment as is
}

const url = process.env.DB_URL as string;

const migrationDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: [path.join(__dirname, '..', 'domain', 'database', 'entities', '*{.ts,.js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  logging: true,
  schema,
});

async function createDataSourceConfig() {
  await initSchemaIfNotExistsAndMoveMigrations(url, schema);
  return migrationDataSource;
}

export default createDataSourceConfig();
