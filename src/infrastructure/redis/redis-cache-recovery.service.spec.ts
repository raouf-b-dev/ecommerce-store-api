import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisCacheRecoveryService } from './redis-cache-recovery.service';
import { RedisService } from './redis.service';
import { RedisIndexInitializerService } from './search/redis-index-initializer.service';
import { MockRedisService } from './testing';
import { VERSIONED_IS_CACHED_FLAGS } from './cache-key-space';

describe('RedisCacheRecoveryService', () => {
  let recovery: RedisCacheRecoveryService;
  let redisService: MockRedisService;
  let indexInitializer: { onModuleInit: jest.Mock };

  beforeEach(async () => {
    redisService = new MockRedisService();
    indexInitializer = { onModuleInit: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheRecoveryService,
        { provide: RedisService, useValue: redisService },
        {
          provide: RedisIndexInitializerService,
          useValue: indexInitializer,
        },
      ],
    }).compile();

    recovery = module.get(RedisCacheRecoveryService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers reconnect listener on init', () => {
    recovery.onModuleInit();
    expect(redisService.onReconnect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('bumps generation, clears flags, and re-inits indexes — without SCAN', async () => {
    recovery.onModuleInit();
    const listener = redisService.onReconnect.mock
      .calls[0][0] as () => Promise<void>;

    await listener();

    expect(redisService.bumpCacheGeneration).toHaveBeenCalled();
    expect(redisService.scanKeys).not.toHaveBeenCalled();
    for (const flag of VERSIONED_IS_CACHED_FLAGS) {
      expect(redisService.del).toHaveBeenCalledWith(flag);
    }
    expect(indexInitializer.onModuleInit).toHaveBeenCalled();
  });
});
