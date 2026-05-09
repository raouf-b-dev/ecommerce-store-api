import { Module, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EnvConfigService } from '../../config/env-config.service';
import Redis from 'ioredis';

const THROTTLER_REDIS_CLIENT = 'THROTTLER_REDIS_CLIENT';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [THROTTLER_REDIS_CLIENT, EnvConfigService],
      useFactory: (redisClient: Redis, config: EnvConfigService) => ({
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
        storage: new ThrottlerStorageRedisService(redisClient),
      }),
    }),
  ],
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
        });
        client.on('error', (err) => {
          Logger.error(
            'Throttler Redis Client Error',
            err,
            'AppThrottlerModule',
          );
        });
        return client;
      },
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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
