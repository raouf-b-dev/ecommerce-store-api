import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import {
  CART_REDIS,
  INVENTORY_REDIS,
  ORDER_REDIS,
  PAYMENT_REDIS,
  PRODUCT_REDIS,
  USER_REDIS,
} from './constants/redis.constants';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';
import {
  toError,
  toErrorMessage,
} from '../../shared-kernel/infra/lang/error.utils';

/**
 * Listens for Redis reconnection events and invalidates stale cache data.
 *
 * When Redis goes down, writes bypass cache and go directly to PostgreSQL.
 * When Redis comes back, cached data may be stale. This service flushes
 * domain caches on reconnection and reinitializes RediSearch indexes.
 */
@Injectable()
export class RedisCacheRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheRecoveryService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly indexInitializer: RedisIndexInitializerService,
  ) {}

  onModuleInit() {
    this.redisService.onReconnect(() => this.handleReconnection());
  }

  private async handleReconnection(): Promise<void> {
    this.logger.log('Redis reconnected — flushing stale domain caches...');

    try {
      await this.flushDomainCaches();
      await this.clearCacheFlags();
      await this.indexInitializer.onModuleInit();

      this.logger.log(
        'Cache recovery complete — cache-aside will repopulate on demand',
      );
    } catch (error) {
      const err = toError(error);
      this.logger.error(`Cache recovery failed: ${err.message}`, err.stack);
    }
  }

  private async flushDomainCaches(): Promise<void> {
    const patterns = [
      `${USER_REDIS.CACHE_KEY}:*`,
      `${PRODUCT_REDIS.CACHE_KEY}:*`,
      `${INVENTORY_REDIS.CACHE_KEY}:*`,
      `${CART_REDIS.CACHE_KEY}:*`,
      `${ORDER_REDIS.CACHE_KEY}:*`,
      `${PAYMENT_REDIS.CACHE_KEY}:*`,
    ];

    for (const pattern of patterns) {
      try {
        const keys = await this.redisService.scanKeys(pattern);
        if (keys.length === 0) continue;

        const pipeline = this.redisService.createPipeline();
        if (!pipeline) continue;

        for (const key of keys) {
          pipeline.json.del(this.redisService.getFullKey(key));
        }
        await pipeline.exec();
        this.logger.log(`Flushed ${keys.length} keys matching "${pattern}"`);
      } catch (error) {
        this.logger.warn(
          `Failed to flush cache for pattern "${pattern}": ${toErrorMessage(error)}`,
        );
      }
    }
  }

  private async clearCacheFlags(): Promise<void> {
    const flags = [
      USER_REDIS.IS_CACHED_FLAG,
      PRODUCT_REDIS.IS_CACHED_FLAG,
      INVENTORY_REDIS.IS_CACHED_FLAG,
      CART_REDIS.IS_CACHED_FLAG,
      ORDER_REDIS.IS_CACHED_FLAG,
      PAYMENT_REDIS.IS_CACHED_FLAG,
    ];

    for (const flag of flags) {
      await this.redisService.del(flag);
    }
  }
}
