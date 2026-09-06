import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
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

/**
 * Kill other normal clients on the chaos Redis instance.
 * Uses a separate connection so we do not need the Testcontainer handle
 * (globalSetup runs in a different process than the test worker).
 */
async function killOtherClients(host: string, port: number): Promise<void> {
  const killer = createClient({
    url: `redis://${host}:${port}`,
    socket: { reconnectStrategy: false },
  });
  await killer.connect();
  try {
    await killer.sendCommand([
      'CLIENT',
      'KILL',
      'TYPE',
      'normal',
      'SKIPME',
      'yes',
    ]);
  } finally {
    await killer.quit().catch(() => undefined);
  }
}

describe('Redis reconnect chaos (Testcontainers)', () => {
  let moduleRef: TestingModule;
  let redisService: RedisService;
  let cache: CacheService;
  let chaosHost: string;
  let chaosPort: number;

  beforeAll(async () => {
    const host = process.env.CHAOS_REDIS_HOST;
    const port = Number(process.env.CHAOS_REDIS_PORT);
    if (!host || !Number.isFinite(port)) {
      throw new Error(
        'Chaos Redis env is missing - globalSetup did not start the container',
      );
    }
    chaosHost = host;
    chaosPort = port;

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
      await redisService?.client?.quit();
    } catch {
      /* already closed */
    }
    await Promise.race([moduleRef?.close(), sleep(3_000)]);
  }, 15_000);

  it('fails open during outage and recovers with a generation bump', async () => {
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

    let failOpenRead: Promise<unknown> | undefined;
    let sawUnavailable = false;

    const sawDisconnect = new Promise<void>((resolve, reject) => {
      const client = redisService.client;
      if (!client) {
        reject(new Error('Redis client is not initialized'));
        return;
      }
      const onOutage = () => {
        sawUnavailable = !cache.isAvailable();
        failOpenRead = cache.get(`${PRODUCT_REDIS.CACHE_KEY}:1`);
        resolve();
      };
      client.once('reconnecting', onOutage);
      client.once('end', onOutage);
    });

    await killOtherClients(chaosHost, chaosPort);

    await Promise.race([
      sawDisconnect,
      sleep(5_000).then(() => {
        throw new Error(
          'App Redis client did not disconnect after CLIENT KILL',
        );
      }),
    ]);

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
