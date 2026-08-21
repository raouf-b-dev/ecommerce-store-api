import { Module, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { UserThrottlerGuard } from './user-throttler.guard';
import { EnvConfigService } from '../../config/env-config.service';
import { ResilientThrottlerStorage } from './resilient-throttler.storage';
import { MetricsService } from '../metrics/metrics.service';
import { logRedisError } from '../redis/redis-error.utils';
import Redis from 'ioredis';

const THROTTLER_REDIS_CLIENT = 'THROTTLER_REDIS_CLIENT';
const throttlerLogger = new Logger('ThrottlerRedis');

@Module({
  providers: [
    {
      provide: THROTTLER_REDIS_CLIENT,
      inject: [EnvConfigService],
      useFactory: (config: EnvConfigService) => {
        const client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined,
          db: config.redis.db,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 500, 10_000),
        });
        client.on('error', (err: unknown) => {
          logRedisError(throttlerLogger, 'Throttler Redis Client', err);
        });
        return client;
      },
    },
  ],
  exports: [THROTTLER_REDIS_CLIENT],
})
class ThrottlerRedisModule {}

@Module({
  imports: [
    ThrottlerRedisModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerRedisModule],
      inject: [THROTTLER_REDIS_CLIENT, EnvConfigService, MetricsService],
      useFactory: (
        redisClient: Redis,
        config: EnvConfigService,
        metrics: MetricsService,
      ) => {
        const redisStorage = new ThrottlerStorageRedisService(redisClient);
        const storage = new ResilientThrottlerStorage(
          redisStorage,
          () => redisClient.status === 'ready',
          (degraded) => metrics.throttlerStorageDegraded.set(degraded ? 1 : 0),
        );

        return {
          throttlers: [
            {
              name: 'default',
              ttl: seconds(60),
              limit: config.throttle.globalLimit,
            },
            {
              name: 'strict',
              ttl: seconds(60),
              limit: config.throttle.strictLimit,
            },
          ],
          storage,
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppThrottlerModule implements OnModuleDestroy {
  constructor(
    @Inject(THROTTLER_REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  async onModuleDestroy() {
    if (this.redisClient) {
      Logger.log('Closing Throttler Redis connection...', 'AppThrottlerModule');
      await this.redisClient.quit();
    }
  }
}
