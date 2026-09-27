import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { INTEGRATION_TEST_DB_CONSTANTS } from './integration-test.constants';

declare global {
  var __INTEGRATION_POSTGRES_CONTAINER__:
    StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  console.log('\n[Integration Testing] Starting PostgreSQL Testcontainer...');

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    INTEGRATION_TEST_DB_CONSTANTS.POSTGRES_IMAGE,
  )
    .withDatabase(INTEGRATION_TEST_DB_CONSTANTS.DB_NAME)
    .withUsername(INTEGRATION_TEST_DB_CONSTANTS.DB_USER)
    .withPassword(INTEGRATION_TEST_DB_CONSTANTS.DB_PASS)
    .withStartupTimeout(
      INTEGRATION_TEST_DB_CONSTANTS.CONTAINER_STARTUP_TIMEOUT_MS,
    )
    .start();

  process.env.INTEGRATION_DB_HOST = container.getHost();
  process.env.INTEGRATION_DB_PORT = container.getPort().toString();
  process.env.INTEGRATION_DB_NAME = container.getDatabase();
  process.env.INTEGRATION_DB_USER = container.getUsername();
  process.env.INTEGRATION_DB_PASS = container.getPassword();

  console.log(
    `[Integration Testing] PostgreSQL Testcontainer ready at ${process.env.INTEGRATION_DB_HOST}:${process.env.INTEGRATION_DB_PORT}`,
  );

  globalThis.__INTEGRATION_POSTGRES_CONTAINER__ = container;
}
