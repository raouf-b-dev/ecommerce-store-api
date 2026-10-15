import globalSetup from './testcontainers.global-setup';
import globalTeardown from './testcontainers.global-teardown';

export default async function () {
  await globalSetup();
  return async () => {
    await globalTeardown();
  };
}
