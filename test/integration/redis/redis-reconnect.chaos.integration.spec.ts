import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from 'src/infrastructure/redis/cache/cache.service';
import { PRODUCT_REDIS } from 'src/infrastructure/redis/constants/redis.constants';
import { RedisCacheRecoveryService } from 'src/infrastructure/redis/redis-cache-recovery.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { RedisIndexInitializerService } from 'src/infrastructure/redis/search/redis-index-initializer.service';
import { EnvConfigService } from 'src/config/env-config.service';
import { MockEnvConfigService } from 'src/testing';
import { REDIS_CHAOS_CONSTANTS } from './redis-chaos.constants';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Redis reconnect chaos (Testcontainers)', () => {
  let moduleRef: TestingModule;
  let redisService: RedisService;
  let cache: CacheService;

  beforeAll(async () => {
    const host = process.env.CHAOS_REDIS_HOST;
    const port = Number(process.env.CHAOS_REDIS_PORT);
    if (!host || !Number.isFinite(port)) {
      throw new Error(
        'Chaos Redis env is missing — globalSetup did not start the container',
      );
    }

    const env = new MockEnvConfigService();
    env.setMockConfig({
      redis: {
        host,
        port,
        password: '',
        key_prefix: REDIS_CHAOS_CONSTANTS.KEY_PREFIX,
        db: 0,
      },
    });

    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: EnvConfigService, useValue: env },
        { provide: Logger, useValue: new Logger('RedisChaos') },
        RedisService,
        CacheService,
        RedisIndexInitializerService,
        RedisCacheRecoveryService,
      ],
    }).compile();

    await moduleRef.init();
    redisService = moduleRef.get(RedisService);
    cache = moduleRef.get(CacheService);

    const ready = await redisService.waitUntilReady(15_000);
    expect(ready).toBe(true);
  }, 60_000);

  afterAll(async () => {
    try {
      redisService?.client?.destroy();
    } catch {
      /* already closed */
    }
    await Promise.race([moduleRef?.close(), sleep(3_000)]);
  }, 15_000);

  it('fails open during outage and recovers with a generation bump', async () => {
    const container = globalThis.__CHAOS_REDIS_CONTAINER__;
    if (!container) {
      throw new Error('Chaos Redis container is not running');
    }

    const generationBefore = redisService.getCacheGeneration();
    await cache.set(`${PRODUCT_REDIS.CACHE_KEY}:1`, { id: 1 }, { ttl: 3600 });
    await cache.set(PRODUCT_REDIS.IS_CACHED_FLAG, 'true', { ttl: 3600 });
    await cache.set(
      'idempotency:chaos-key',
      { status: 'in-progress' },
      { ttl: 3600 },
    );

    const recovered = new Promise<void>((resolve) => {
      redisService.onReconnect(() => resolve());
    });

    let sawUnavailable = false;
    let failOpenRead: Promise<unknown> | undefined;
    const poll = setInterval(() => {
      if (!cache.isAvailable()) {
        sawUnavailable = true;
        if (!failOpenRead) {
          failOpenRead = cache.get(`${PRODUCT_REDIS.CACHE_KEY}:1`);
        }
      }
    }, 5);

    await container.exec(['redis-cli', 'CLIENT', 'KILL', 'TYPE', 'normal']);

    const waitUntilDown = Date.now() + 2_000;
    while (!sawUnavailable && Date.now() < waitUntilDown) {
      await sleep(5);
    }

    if (!sawUnavailable) {
      await container.restart({ timeout: 20 });
      const waitRestart = Date.now() + 15_000;
      while (!sawUnavailable && Date.now() < waitRestart) {
        await sleep(5);
      }
    }
    clearInterval(poll);

    expect(sawUnavailable).toBe(true);
    expect(failOpenRead).toBeDefined();
    await expect(failOpenRead).resolves.toBeNull();

    await Promise.race([
      recovered,
      sleep(20_000).then(() => {
        throw new Error('Redis did not emit reconnect recovery');
      }),
    ]);

    const deadline = Date.now() + 10_000;
    while (
      redisService.getCacheGeneration() <= generationBefore &&
      Date.now() < deadline
    ) {
      await sleep(50);
    }

    expect(redisService.getCacheGeneration()).toBeGreaterThan(generationBefore);

    const flag = await cache.get(PRODUCT_REDIS.IS_CACHED_FLAG);
    expect(flag).toBeNull();

    const idempotency = await cache.get('idempotency:chaos-key');
    expect(idempotency).not.toBeNull();
  }, 90_000);
});
