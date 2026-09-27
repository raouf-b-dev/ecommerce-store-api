import { Logger } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { logRedisError } from '../redis/redis-error.utils';

export class ResilientThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(ResilientThrottlerStorage.name);
  private readonly memoryStorage = new ThrottlerStorageService();
  private degraded = false;

  constructor(
    private readonly redisStorage: ThrottlerStorageRedisService,
    private readonly isRedisReady: () => boolean,
    private readonly onDegradedChange?: (degraded: boolean) => void,
  ) {}

  isDegraded(): boolean {
    return this.degraded;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    if (!this.isRedisReady()) {
      this.setDegraded(true);
      return this.memoryStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }

    try {
      const result = await this.redisStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
      this.setDegraded(false);
      return result;
    } catch (error) {
      logRedisError(this.logger, 'ResilientThrottlerStorage.increment', error);
      this.setDegraded(true);
      return this.memoryStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }

  private setDegraded(degraded: boolean): void {
    if (this.degraded === degraded) return;
    this.degraded = degraded;
    if (degraded) {
      this.logger.warn(
        'Throttler storage degraded - using in-memory fallback (per-instance limits)',
      );
    }
    this.onDegradedChange?.(degraded);
  }
}
