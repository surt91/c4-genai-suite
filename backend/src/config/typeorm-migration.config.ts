import { DataSource } from 'typeorm';
import { entities, migrations } from '../domain/database/typeorm-sources.js';
import { initSchemaIfNotExistsAndMoveMigrations, schema } from '../domain/database/typeorm.helper.js';

try {
  process.loadEnvFile();
} catch {
  // no .env file, use the environment as is
}

const url = process.env.DB_URL as string;

const migrationDataSource = new DataSource({
  type: 'postgres',
  url,
  entities,
  migrations,
  logging: true,
  schema,
});

async function createDataSourceConfig() {
  await initSchemaIfNotExistsAndMoveMigrations(url, schema);
  return migrationDataSource;
}

export default createDataSourceConfig();
