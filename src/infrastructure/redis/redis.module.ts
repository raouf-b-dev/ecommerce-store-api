import { Logger, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisKeyClient } from './clients/redis-key.client';
import { RedisSearchClient } from './clients/redis-search.client';
import { CacheService } from './cache/cache.service';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';
import { RedisJsonClient } from './clients/redis-json.client';
import { CachePort } from './cache/cache.port';
import { RedisCacheRecoveryService } from './redis-cache-recovery.service';

@Module({
  providers: [
    RedisService,
    RedisJsonClient,
    RedisKeyClient,
    RedisSearchClient,
    {
      provide: CachePort,
      useClass: CacheService,
    },
    CacheService,
    RedisIndexInitializerService,
    RedisCacheRecoveryService,
    Logger,
  ],
  exports: [
    CachePort,
    RedisService,
    RedisJsonClient,
    RedisKeyClient,
    RedisSearchClient,
  ],
})
export class RedisModule {}
