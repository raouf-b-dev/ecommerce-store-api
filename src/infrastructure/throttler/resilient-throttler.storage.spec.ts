import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ResilientThrottlerStorage } from './resilient-throttler.storage';

describe('ResilientThrottlerStorage', () => {
  const record = {
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  };

  it('uses memory storage when redis is not ready', async () => {
    const redisStorage = {
      increment: jest.fn(),
    } as unknown as ThrottlerStorageRedisService;

    const storage = new ResilientThrottlerStorage(redisStorage, () => false);

    const result = await storage.increment('key', 60, 10, 0, 'default');

    expect(result.totalHits).toBe(1);
    expect(redisStorage.increment).not.toHaveBeenCalled();
    expect(storage.isDegraded()).toBe(true);
  });

  it('falls back to memory when redis increment throws', async () => {
    const redisStorage = {
      increment: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    } as unknown as ThrottlerStorageRedisService;

    const onDegradedChange = jest.fn();
    const storage = new ResilientThrottlerStorage(
      redisStorage,
      () => true,
      onDegradedChange,
    );

    const result = await storage.increment('key', 60, 10, 0, 'default');

    expect(result.totalHits).toBe(1);
    expect(onDegradedChange).toHaveBeenCalledWith(true);
  });

  it('uses redis storage when healthy', async () => {
    const redisStorage = {
      increment: jest.fn().mockResolvedValue(record),
    } as unknown as ThrottlerStorageRedisService;

    const storage = new ResilientThrottlerStorage(redisStorage, () => true);

    const result = await storage.increment('key', 60, 10, 0, 'default');

    expect(result).toEqual(record);
    expect(redisStorage.increment).toHaveBeenCalled();
    expect(storage.isDegraded()).toBe(false);
  });
});
