import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { EnvConfigService } from '../../../config/env-config.service';
import { createClient } from 'redis';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;
  let mockEnvConfig: any;

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
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
