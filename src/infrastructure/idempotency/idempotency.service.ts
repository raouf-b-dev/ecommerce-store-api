import { Injectable, Logger } from '@nestjs/common';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import {
  IdempotencyStore,
  IdempotencyResult,
} from '../../shared-kernel/domain/stores/idempotency.store';
import { CachePort } from '../redis/cache/cache.port';

@Injectable()
export class IdempotencyService extends IdempotencyStore {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly cacheService: CachePort) {
    super();
  }

  async checkAndLock<T>(
    key: string,
    ttlSeconds: number = IDEMPOTENCY_REDIS.EXPIRATION,
  ): Promise<IdempotencyResult<T>> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    try {
      // 1. Atomic lock attempt using SET NX
      const isLocked = await this.cacheService.set(
        cacheKey,
        { status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS },
        { ttl: ttlSeconds, nx: true },
      );

      if (isLocked) {
        this.logger.log(
          `Idempotency key ${key} marked as in-progress (atomic lock)`,
        );
        return { isNew: true };
      }

      // 2. Key already exists — retrieve status/payload
      const existing = await this.cacheService.get<{
        status: string;
        data?: T;
      }>(cacheKey);

      if (existing) {
        if (
          existing.status === IDEMPOTENCY_REDIS.STATUS.COMPLETED &&
          existing.data
        ) {
          this.logger.log(`Idempotency key ${key} found with completed result`);
          return { isNew: false, data: existing.data };
        }
        if (existing.status === IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS) {
          this.logger.log(`Idempotency key ${key} is in-progress`);
          return { isNew: false };
        }
      }

      return { isNew: false };
    } catch (error) {
      this.logger.warn(
        `Idempotency fail-open for key ${key} (degraded: true, concern: idempotency)`,
        error,
      );
      return { isNew: true };
    }
  }

  /**
   * Store the completed result for an idempotency key.
   */
  async complete<T>(
    key: string,
    data: T,
    ttlSeconds: number = IDEMPOTENCY_REDIS.EXPIRATION,
  ): Promise<void> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    try {
      await this.cacheService.set(
        cacheKey,
        { status: IDEMPOTENCY_REDIS.STATUS.COMPLETED, data },
        { ttl: ttlSeconds },
      );
      this.logger.log(`Idempotency key ${key} marked as completed`);
    } catch (error) {
      this.logger.error(`Error completing idempotency key ${key}:`, error);
    }
  }

  /**
   * Remove an idempotency key (e.g., on failure to allow retry).
   */
  async release(key: string): Promise<void> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    try {
      await this.cacheService.delete(cacheKey);
      this.logger.log(`Idempotency key ${key} released`);
    } catch (error) {
      this.logger.error(`Error releasing idempotency key ${key}:`, error);
    }
  }
}
