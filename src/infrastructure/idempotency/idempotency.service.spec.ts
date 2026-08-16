import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import { MockCacheService } from '../../testing';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let cacheService: MockCacheService;

  beforeEach(() => {
    cacheService = new MockCacheService();
    service = new IdempotencyService(cacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndLock', () => {
    it('should acquire lock atomically when key is new (SET NX succeeds)', async () => {
      cacheService.set.mockResolvedValue(true);

      const result = await service.checkAndLock('test-key-1');

      expect(result).toEqual({ isNew: true });
      expect(cacheService.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-1`,
        { status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS },
        { ttl: IDEMPOTENCY_REDIS.EXPIRATION, nx: true },
      );
    });

    it('should return isNew: false when key already exists and is in-progress', async () => {
      cacheService.set.mockResolvedValue(false);
      cacheService.get.mockResolvedValue({
        status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS,
      });

      const result = await service.checkAndLock('test-key-2');

      expect(result).toEqual({ isNew: false });
      expect(cacheService.get).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-2`,
      );
    });

    it('should return completed data when key already completed', async () => {
      const payload = { orderId: 123, status: 'PAID' };
      cacheService.set.mockResolvedValue(false);
      cacheService.get.mockResolvedValue({
        status: IDEMPOTENCY_REDIS.STATUS.COMPLETED,
        data: payload,
      });

      const result = await service.checkAndLock<{ orderId: number }>(
        'test-key-3',
      );

      expect(result).toEqual({ isNew: false, data: payload });
    });

    it('should handle concurrent Promise.all calls so exactly one request acquires the lock', async () => {
      let isLocked = false;

      // Simulate atomic SET NX: first request gets true, subsequent get false
      cacheService.set.mockImplementation((_key, _val, options) => {
        if (options?.nx) {
          if (!isLocked) {
            isLocked = true;
            return Promise.resolve(true);
          }
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      cacheService.get.mockResolvedValue({
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
      cacheService.set.mockResolvedValue(true);
      const data = { id: 10 };

      await service.complete('test-key-4', data, 1800);

      expect(cacheService.set).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-4`,
        { status: IDEMPOTENCY_REDIS.STATUS.COMPLETED, data },
        { ttl: 1800 },
      );
    });
  });

  describe('release', () => {
    it('should delete the idempotency key', async () => {
      cacheService.delete.mockResolvedValue(undefined);

      await service.release('test-key-5');

      expect(cacheService.delete).toHaveBeenCalledWith(
        `${IDEMPOTENCY_REDIS.PREFIX}:test-key-5`,
      );
    });
  });
});
