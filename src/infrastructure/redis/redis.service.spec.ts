import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisService } from './redis.service';
import { EnvConfigService } from '../../config/env-config.service';
import { MockEnvConfigService, MockLogger } from '../../testing';
import { MockRedisNodeClient, RedisIndexTestFactory } from './testing';

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
        expect.objectContaining({
          url: 'redis://localhost:6379',
          password: 'testpass',
          database: 0,
        }),
      );
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockClient.connect).toHaveBeenCalled();
      expect(service.isReady()).toBe(true);
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
      (service as any).connected = false;

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
        service.createIndex('order_index', schema, 'order:'),
      ).resolves.toBe(false);

      expect(mockClient.ft.create).not.toHaveBeenCalled();
    });

    it('creates index when missing', async () => {
      mockClient.ft.mockIndexMissing();

      await expect(
        service.createIndex('order_index', schema, 'order:'),
      ).resolves.toBe(true);

      expect(mockClient.ft.create).toHaveBeenCalledWith(
        'test:order_index',
        schema,
        { ON: 'JSON', PREFIX: ['test:order:'] },
      );
    });

    it('returns false on concurrent already-exists race', async () => {
      mockClient.ft.mockIndexMissing();
      mockClient.ft.mockCreateAlreadyExists();

      await expect(
        service.createIndex('order_index', schema, 'order:'),
      ).resolves.toBe(false);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should quit client if available', async () => {
      service.client = mockClient;
      await service.onApplicationShutdown();
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should do nothing if no client', async () => {
      service.client = null;
      await service.onApplicationShutdown();
      expect(mockClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('getFullKey', () => {
    it('should prefix key correctly', () => {
      expect(service.getFullKey('abc')).toBe('test:abc');
    });
  });

  describe('removePrefix', () => {
    it('should remove prefix if present', () => {
      expect(service.removePrefix('test:abc')).toBe('abc');
    });

    it('should return key unchanged if prefix not present', () => {
      expect(service.removePrefix('xyz')).toBe('xyz');
    });
  });
});
