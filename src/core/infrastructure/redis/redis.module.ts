import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisKeyClient } from './commands/redis-key.client';
import { RedisSearchClient } from './commands/redis-search.client';
import { CacheService } from './cache/cache.service';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';
import { RedisJsonClient } from './commands/redis-json.client';

// Export CacheService and RedisService for backward compatibility (CacheService uses RedisService)
@Module({
  providers: [
    RedisService,
    RedisJsonClient,
    RedisKeyClient,
    RedisSearchClient,
    CacheService,
    RedisIndexInitializerService,
  ],
  exports: [
    CacheService,
    RedisService,
    RedisJsonClient,
    RedisKeyClient,
    RedisSearchClient,
  ],
})
export class RedisModule {}
