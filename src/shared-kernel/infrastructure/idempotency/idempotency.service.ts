import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../redis/cache/cache.service';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';
import {
  IdempotencyStore,
  IdempotencyResult,
} from '../../domain/stores/idempotency.store';

@Injectable()
export class IdempotencyService extends IdempotencyStore {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async checkAndLock<T>(
    key: string,
    ttlSeconds: number = IDEMPOTENCY_REDIS.EXPIRATION,
  ): Promise<IdempotencyResult<T>> {
    const cacheKey = `${IDEMPOTENCY_REDIS.PREFIX}:${key}`;

    try {
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

      // Mark as in-progress
      await this.cacheService.set(
        cacheKey,
        { status: IDEMPOTENCY_REDIS.STATUS.IN_PROGRESS },
        { ttl: ttlSeconds },
      );
      this.logger.log(`Idempotency key ${key} marked as in-progress`);
      return { isNew: true };
    } catch (error) {
      this.logger.error(`Error checking idempotency key ${key}:`, error);
      // On error, allow the request to proceed (fail-open)
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
