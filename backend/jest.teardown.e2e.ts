import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const teardown = async () => {
  // only set if jest.setup.e2e.ts started a testcontainer
  // @ts-expect-error global set in the setup function
  await (globalThis.dbContainer as StartedPostgreSqlContainer | undefined)?.stop();
};

export default teardown;
