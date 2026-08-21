import { createHealthAwareProxy } from './health-aware-proxy';

describe('createHealthAwareProxy', () => {
  const primary = {
    find: jest.fn().mockResolvedValue('cached'),
  };
  const fallback = {
    find: jest.fn().mockResolvedValue('postgres'),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('routes to primary when healthy', async () => {
    const proxy = createHealthAwareProxy(primary, fallback, () => true);
    await expect(proxy.find()).resolves.toBe('cached');
    expect(primary.find).toHaveBeenCalled();
    expect(fallback.find).not.toHaveBeenCalled();
  });

  it('routes to fallback when unhealthy', async () => {
    const proxy = createHealthAwareProxy(primary, fallback, () => false);
    await expect(proxy.find()).resolves.toBe('postgres');
    expect(fallback.find).toHaveBeenCalled();
    expect(primary.find).not.toHaveBeenCalled();
  });
});
