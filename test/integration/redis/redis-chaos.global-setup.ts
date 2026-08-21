import { GenericContainer } from 'testcontainers';
import type { StartedTestContainer } from 'testcontainers';
import { REDIS_CHAOS_CONSTANTS } from './redis-chaos.constants';

declare global {
  var __CHAOS_REDIS_CONTAINER__: StartedTestContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  console.log('\n[Redis Chaos] Starting Redis Stack Testcontainer...');

  const container = await new GenericContainer(
    REDIS_CHAOS_CONSTANTS.REDIS_IMAGE,
  )
    .withExposedPorts(6379)
    .withStartupTimeout(REDIS_CHAOS_CONSTANTS.CONTAINER_STARTUP_TIMEOUT_MS)
    .start();

  process.env.CHAOS_REDIS_HOST = container.getHost();
  process.env.CHAOS_REDIS_PORT = container.getMappedPort(6379).toString();

  console.log(
    `[Redis Chaos] Redis Stack ready at ${process.env.CHAOS_REDIS_HOST}:${process.env.CHAOS_REDIS_PORT}`,
  );

  globalThis.__CHAOS_REDIS_CONTAINER__ = container;
}
