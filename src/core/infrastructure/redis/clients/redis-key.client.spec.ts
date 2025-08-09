import { Test, TestingModule } from '@nestjs/testing';
import { RedisKeyClient } from './redis-key.client';
import { RedisService } from '../redis.service';

describe('RedisKeyClient', () => {
  let service: RedisKeyClient;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisKeyClient,
        {
          provide: RedisService,
          useValue: {
            getFullKey: jest.fn(),
            removePrefix: jest.fn(),
            client: {
              ttl: jest.fn(),
              expire: jest.fn(),
              multi: jest.fn(),
              scan: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RedisKeyClient>(RedisKeyClient);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ttl should call getFullKey and client.ttl', async () => {
    redisService.getFullKey.mockReturnValue('prefix:key');
    (redisService.client.ttl as jest.Mock).mockResolvedValue(100);

    const result = await service.ttl('key');

    expect(redisService.getFullKey).toHaveBeenCalledWith('key');
    expect(redisService.client.ttl).toHaveBeenCalledWith('prefix:key');
    expect(result).toBe(100);
  });

  it('expire should call getFullKey and client.expire', async () => {
    redisService.getFullKey.mockReturnValue('prefix:key');
    (redisService.client.expire as jest.Mock).mockResolvedValue(1);

    const result = await service.expire('key', 500);

    expect(redisService.getFullKey).toHaveBeenCalledWith('key');
    expect(redisService.client.expire).toHaveBeenCalledWith('prefix:key', 500);
    expect(result).toBe(1);
  });

  it('createPipeline should call client.multi', () => {
    const pipelineMock = {};
    (redisService.client.multi as jest.Mock).mockReturnValue(pipelineMock);

    const result = service.createPipeline();

    expect(redisService.client.multi).toHaveBeenCalled();
    expect(result).toBe(pipelineMock);
  });

  it('scanKeys should scan until cursor is 0 and return keys without prefix', async () => {
    redisService.getFullKey.mockImplementation((k) => `prefix:${k}`);
    redisService.removePrefix.mockImplementation((k) =>
      k.replace('prefix:', ''),
    );

    (redisService.client.scan as jest.Mock)
      .mockResolvedValueOnce({
        cursor: '1',
        keys: ['prefix:key1', 'prefix:key2'],
      })
      .mockResolvedValueOnce({
        cursor: '0',
        keys: ['prefix:key3'],
      });

    const result = await service.scanKeys('pattern', 50);

    expect(redisService.getFullKey).toHaveBeenCalledWith('pattern');
    expect(redisService.client.scan).toHaveBeenNthCalledWith(1, '0', {
      MATCH: 'prefix:pattern',
      COUNT: 50,
    });
    expect(redisService.client.scan).toHaveBeenNthCalledWith(2, '1', {
      MATCH: 'prefix:pattern',
      COUNT: 50,
    });
    expect(redisService.removePrefix).toHaveBeenCalledTimes(3);
    expect(result).toEqual(['key1', 'key2', 'key3']);
  });
});
