import globalSetup from './redis-chaos.global-setup';
import globalTeardown from './redis-chaos.global-teardown';

export default async function () {
  await globalSetup();
  return async () => {
    await globalTeardown();
  };
}
