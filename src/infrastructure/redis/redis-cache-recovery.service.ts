import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { RedisService } from './redis.service';
import { VERSIONED_IS_CACHED_FLAGS } from './cache-key-space';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';
import {
  toError,
  toErrorMessage,
} from '../../shared-kernel/infra/lang/error.utils';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Listens for Redis reconnection events and invalidates stale cache-aside data.
 *
 * When Redis goes down, writes bypass cache and go directly to PostgreSQL.
 * When Redis comes back, cached data may be stale. This service bumps the cache
 * generation (versioned keys move to a new namespace; old keys expire via TTL),
 * drops prior-generation RediSearch indexes, clears list-cache flags, and
 * reinitializes indexes for the new generation.
 */
@Injectable()
export class RedisCacheRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheRecoveryService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly indexInitializer: RedisIndexInitializerService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  onModuleInit() {
    this.redisService.onReconnect(() => this.handleReconnection());
  }

  private async handleReconnection(): Promise<void> {
    this.logger.log('Redis reconnected — bumping cache generation...');

    try {
      const { previousGeneration, generation } =
        await this.redisService.bumpCacheGeneration();
      await this.redisService.dropVersionedIndexesForGeneration(
        previousGeneration,
      );
      await this.clearCacheFlags();
      await this.indexInitializer.onModuleInit();

      this.logger.log(
        `Cache recovery complete — generation=${generation} (was ${previousGeneration}); cache-aside will repopulate on demand`,
      );
    } catch (error) {
      const err = toError(error);
      this.metrics?.redisCacheRecoveryFailuresTotal.inc();
      this.logger.error(`Cache recovery failed: ${err.message}`, err.stack);
    }
  }

  private async clearCacheFlags(): Promise<void> {
    for (const flag of VERSIONED_IS_CACHED_FLAGS) {
      try {
        await this.redisService.del(flag);
      } catch (error) {
        this.logger.warn(
          `Failed to clear cache flag "${flag}": ${toErrorMessage(error)}`,
        );
      }
    }
  }
}
