import { Test, TestingModule } from '@nestjs/testing';
import { RedisJsonClient } from './redis-json.client';
import { RedisService } from '../redis.service';

describe('RedisJsonClient', () => {
  let service: RedisJsonClient;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisJsonClient,
        {
          provide: RedisService,
          useValue: {
            getFullKey: jest.fn(),
            client: {
              json: {
                set: jest.fn(),
                merge: jest.fn(),
                get: jest.fn(),
                del: jest.fn(),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<RedisJsonClient>(RedisJsonClient);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should call json.set with full key and default options', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');
      (redisService.client.json.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.set('key', '$', { foo: 'bar' } as any);

      expect(redisService.getFullKey).toHaveBeenCalledWith('key');
      expect(redisService.client.json.set).toHaveBeenCalledWith(
        'prefix:key',
        '$',
        { foo: 'bar' },
        {},
      );
      expect(result).toBe(true);
    });

    it('should call json.set with NX option when nx is true', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');
      (redisService.client.json.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.set('key', '$', { foo: 'bar' } as any, {
        nx: true,
      });

      expect(redisService.client.json.set).toHaveBeenCalledWith(
        'prefix:key',
        '$',
        { foo: 'bar' },
        { NX: true },
      );
      expect(result).toBe(true);
    });

    it('should return false when set operation is not successful', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');
      (redisService.client.json.set as jest.Mock).mockResolvedValue(null);

      const result = await service.set('key', '$', { foo: 'bar' } as any);

      expect(result).toBe(false);
    });
  });

  describe('merge', () => {
    it('should call json.merge with full key', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');

      await service.merge('key', '$', { a: 1 } as any);

      expect(redisService.getFullKey).toHaveBeenCalledWith('key');
      expect(redisService.client.json.merge).toHaveBeenCalledWith(
        'prefix:key',
        '$',
        { a: 1 },
      );
    });
  });

  describe('get', () => {
    it('should call json.get with full key and path', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');
      (redisService.client.json.get as jest.Mock).mockResolvedValue({
        foo: 'bar',
      });

      const result = await service.get('key', '$');

      expect(redisService.getFullKey).toHaveBeenCalledWith('key');
      expect(redisService.client.json.get).toHaveBeenCalledWith('prefix:key', {
        path: '$',
      });
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should call json.get with undefined path when path is not provided', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');
      (redisService.client.json.get as jest.Mock).mockResolvedValue({
        foo: 'bar',
      });

      const result = await service.get('key');

      expect(redisService.client.json.get).toHaveBeenCalledWith('prefix:key', {
        path: undefined,
      });
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null when key does not exist', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');
      (redisService.client.json.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('key', '$');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should call json.del with full key and path', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');

      await service.del('key', '$');

      expect(redisService.getFullKey).toHaveBeenCalledWith('key');
      expect(redisService.client.json.del).toHaveBeenCalledWith(
        'prefix:key',
        '$',
      );
    });

    it('should call json.del with undefined path when path is not provided', async () => {
      redisService.getFullKey.mockReturnValue('prefix:key');

      await service.del('key');

      expect(redisService.client.json.del).toHaveBeenCalledWith(
        'prefix:key',
        undefined,
      );
    });
  });
});
