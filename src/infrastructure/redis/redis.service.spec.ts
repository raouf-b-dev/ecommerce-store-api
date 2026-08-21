// src/core/infrastructure/redis/redis.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { EnvConfigService } from '../../config/env-config.service';
import { createClient } from 'redis';
import { Logger } from '@nestjs/common';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;
  let mockEnvConfig: any;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn(),
      on: jest.fn(),
      isReady: true,
      json: {
        get: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockReturnValue(mockClient);

    mockEnvConfig = {
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'testpass',
        db: 0,
        key_prefix: 'test:',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: EnvConfigService, useValue: mockEnvConfig },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    logger = module.get(Logger);
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
      mockClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

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
