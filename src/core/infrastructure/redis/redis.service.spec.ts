// src/core/infrastructure/redis/redis.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { EnvConfigService } from '../../../config/env-config.service';
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
      connect: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
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

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        password: 'testpass',
        database: 0,
      });
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should log error when redis emits error event', async () => {
      await service.onModuleInit();

      const errorHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      )[1];

      const testError = new Error('Redis failed');
      errorHandler(testError);

      expect(logger.error).toHaveBeenCalledWith(
        'Redis Client Error',
        testError,
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit client if available', async () => {
      service.client = mockClient;
      await service.onModuleDestroy();
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should do nothing if no client', async () => {
      service.client = null;
      await service.onModuleDestroy();
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
