import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisService } from './redis.service';
import { EnvConfigService } from '../../config/env-config.service';
import { MockEnvConfigService, MockLogger } from '../../testing';
import { MockRedisNodeClient, RedisIndexTestFactory } from './testing';
import { buildNodeRedisClientOptions } from './redis-connection.options';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: MockRedisNodeClient;
  let envConfig: MockEnvConfigService;
  let logger: MockLogger;

  beforeEach(async () => {
    mockClient = new MockRedisNodeClient();
    (createClient as jest.Mock).mockReturnValue(mockClient);

    envConfig = new MockEnvConfigService();
    envConfig.setMockConfig({
      redis: {
        ...envConfig.redis,
        password: 'testpass',
      },
    });

    logger = new MockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: EnvConfigService, useValue: envConfig },
        { provide: Logger, useValue: logger },
      ],
    }).compile();

    service = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create client and connect', async () => {
      await service.onModuleInit();

      expect(createClient).toHaveBeenCalledWith(
        buildNodeRedisClientOptions({
          host: 'localhost',
          port: 6379,
          password: 'testpass',
          key_prefix: 'test:',
          db: 0,
        }),
      );
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.incr).toHaveBeenCalledWith(
        'test:meta:cache_generation',
      );
      expect(service.isReady()).toBe(true);
      expect(service.getCacheGeneration()).toBe(1);
    });

    it('should continue boot when connect fails', async () => {
      mockClient.mockConnectFailure();

      await service.onModuleInit();

      expect(service.isReady()).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis unavailable at startup'),
      );
    });
  });

  describe('guarded operations', () => {
    it('jsonGet returns null when not ready', async () => {
      await service.onModuleInit();
      mockClient.isReady = false;
      (service as unknown as { connected: boolean }).connected = false;

      await expect(service.jsonGet('key')).resolves.toBeNull();
    });
  });

  describe('createIndex', () => {
    const schema = RedisIndexTestFactory.createMinimalTextSchema();

    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('skips create when index already exists', async () => {
      mockClient.ft.mockIndexExists();

      await expect(
        service.createIndex('order_index', schema, 'order_cache:'),
      ).resolves.toBe(false);

      expect(mockClient.ft.create).not.toHaveBeenCalled();
    });

    it('creates index when missing', async () => {
      mockClient.ft.mockIndexMissing();

      await expect(
        service.createIndex('order_index', schema, 'order_cache:'),
      ).resolves.toBe(true);

      expect(mockClient.ft.create).toHaveBeenCalledWith(
        'test:c1:order_index',
        schema,
        { ON: 'JSON', PREFIX: ['test:c1:order_cache:'] },
      );
    });

    it('returns false on concurrent already-exists race', async () => {
      mockClient.ft.mockIndexMissing();
      mockClient.ft.mockCreateAlreadyExists();

      await expect(
        service.createIndex('order_index', schema, 'order_cache:'),
      ).resolves.toBe(false);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should quit client if available', async () => {
      service.client = mockClient as unknown as RedisService['client'];
      await service.onApplicationShutdown();
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should do nothing if no client', async () => {
      service.client = null;
      await service.onApplicationShutdown();
      expect(mockClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('getFullKey / generation', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('versions cache-aside keys', () => {
      expect(service.getFullKey('product_cache:1')).toBe(
        'test:c1:product_cache:1',
      );
      expect(service.getFullKey('product_index')).toBe('test:c1:product_index');
      expect(service.getFullKey('product_list:isCached')).toBe(
        'test:c1:product_list:isCached',
      );
    });

    it('does not version idempotency or meta keys', () => {
      expect(service.getFullKey('idempotency:abc')).toBe(
        'test:idempotency:abc',
      );
      expect(service.getFullKey('meta:cache_generation')).toBe(
        'test:meta:cache_generation',
      );
    });

    it('bumpCacheGeneration updates versioned keys', async () => {
      mockClient.incr.mockResolvedValue(2);
      await service.bumpCacheGeneration();
      expect(service.getFullKey('user_cache:9')).toBe('test:c2:user_cache:9');
      expect(service.getFullKey('idempotency:abc')).toBe(
        'test:idempotency:abc',
      );
    });
  });

  describe('removePrefix', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('strips env prefix and generation segment', () => {
      expect(service.removePrefix('test:c1:product_cache:1')).toBe(
        'product_cache:1',
      );
    });

    it('strips env prefix only for stable keys', () => {
      expect(service.removePrefix('test:idempotency:x')).toBe('idempotency:x');
    });

    it('should return key unchanged if prefix not present', () => {
      expect(service.removePrefix('xyz')).toBe('xyz');
    });
  });

  describe('jsonSet with ttl', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('uses MULTI for atomic set + expire', async () => {
      const multi = {
        json: { set: jest.fn().mockReturnThis() },
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 1]),
      };
      mockClient.multi.mockReturnValue(multi);

      await expect(
        service.jsonSet('product_cache:1', '$', { id: 1 }, { ttl: 60 }),
      ).resolves.toBe(true);

      expect(mockClient.multi).toHaveBeenCalled();
      expect(multi.json.set).toHaveBeenCalled();
      expect(multi.expire).toHaveBeenCalledWith('test:c1:product_cache:1', 60);
      expect(multi.exec).toHaveBeenCalled();
    });
  });
});
