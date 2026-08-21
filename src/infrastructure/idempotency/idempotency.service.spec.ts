import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import { MockCacheService } from '../../testing';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let cache: MockCacheService;

  beforeEach(() => {
    cache = new MockCacheService();
    cache.mockAvailable();
    service = new IdempotencyService(cache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndLock', () => {
    it('should acquire lock atomically when key is new (SET NX succeeds)', async () => {
      cache.set.mockResolvedValue(true);

      const result = await service.checkAndLock('test-key-1');

      expect(result).toEqual({ isNew: true });
      expect(cache.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-1`,
        { status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS },
        { ttl: IDEMPOTENCY_REDIS.EXPIRATION, nx: true },
      );
    });

    it('should return isNew: false when key already exists and is in-progress', async () => {
      cache.set.mockResolvedValue(false);
      cache.get.mockResolvedValue({
        status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS,
      });

      const result = await service.checkAndLock('test-key-2');

      expect(result).toEqual({ isNew: false });
      expect(cache.get).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-2`,
      );
    });

    it('should return completed data when key already completed', async () => {
      const payload = { orderId: 123, status: 'PAID' };
      cache.set.mockResolvedValue(false);
      cache.get.mockResolvedValue({
        status: IDEMPOTENCY_REDIS.STATUS.COMPLETED,
        data: payload,
      });

      const result = await service.checkAndLock<{ orderId: number }>(
        'test-key-3',
      );

      expect(result).toEqual({ isNew: false, data: payload });
    });

    it('should fail closed when cache is unavailable', async () => {
      cache.mockUnavailable();

      const result = await service.checkAndLock('cache-down');

      expect(result).toEqual({ isNew: false, unavailable: true });
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should fail closed when cache errors during lock', async () => {
      cache.set.mockRejectedValue(new Error('ECONNRESET'));

      const result = await service.checkAndLock('cache-error');

      expect(result).toEqual({ isNew: false, unavailable: true });
    });

    it('should treat SET NX miss + GET miss as new when cache is available (TTL race)', async () => {
      cache.set.mockResolvedValue(false);
      cache.get.mockResolvedValue(null);

      const result = await service.checkAndLock('ttl-race');

      expect(result).toEqual({ isNew: true });
    });

    it('should handle concurrent Promise.all calls so exactly one request acquires the lock', async () => {
      let isLocked = false;

      cache.set.mockImplementation((_key, _val, options) => {
        if (options?.nx) {
          if (!isLocked) {
            isLocked = true;
            return Promise.resolve(true);
          }
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      cache.get.mockResolvedValue({
        status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS,
      });

      const key = 'concurrent-key-99';
      const [res1, res2, res3] = await Promise.all([
        service.checkAndLock(key),
        service.checkAndLock(key),
        service.checkAndLock(key),
      ]);

      const acquiredCount = [res1, res2, res3].filter((r) => r.isNew).length;
      const rejectedCount = [res1, res2, res3].filter((r) => !r.isNew).length;

      expect(acquiredCount).toBe(1);
      expect(rejectedCount).toBe(2);
    });
  });

  describe('complete', () => {
    it('should update key status to COMPLETED with payload', async () => {
      cache.set.mockResolvedValue(true);
      const data = { id: 10 };

      await service.complete('test-key-4', data, 1800);

      expect(cache.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-4`,
        { status: IDEMPOTENCY_REDIS.STATUS.COMPLETED, data },
        { ttl: 1800 },
      );
    });

    it('should throw when cache is unavailable so callers fail closed', async () => {
      cache.mockUnavailable();

      await expect(service.complete('test-key-4', { id: 1 })).rejects.toThrow(
        /cache unavailable/,
      );
    });
  });

  describe('release', () => {
    it('should delete the idempotency key', async () => {
      cache.delete.mockResolvedValue(undefined);

      await service.release('test-key-5');

      expect(cache.delete).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-5`,
      );
    });
  });
});
