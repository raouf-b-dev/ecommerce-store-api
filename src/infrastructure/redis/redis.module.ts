import { Logger, Module } from '@nestjs/common';
import { CachePort } from '../../shared-kernel/domain/interfaces/cache.port';
import { CacheService } from './cache/cache.service';
import { RedisCacheRecoveryService } from './redis-cache-recovery.service';
import { RedisService } from './redis.service';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';

@Module({
  providers: [
    RedisService,
    CacheService,
    {
      provide: CachePort,
      useExisting: CacheService,
    },
    RedisIndexInitializerService,
    RedisCacheRecoveryService,
    Logger,
  ],
  exports: [CachePort, RedisService],
})
export class RedisModule {}
