import { Logger, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache/cache.service';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';
import { CachePort } from '../../shared-kernel/domain/interfaces/cache.port';
import { RedisCacheRecoveryService } from './redis-cache-recovery.service';

@Module({
  providers: [
    RedisService,
    {
      provide: CachePort,
      useClass: CacheService,
    },
    RedisIndexInitializerService,
    RedisCacheRecoveryService,
    Logger,
  ],
  exports: [CachePort, RedisService],
})
export class RedisModule {}
