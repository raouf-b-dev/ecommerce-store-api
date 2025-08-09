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

  it('set should call json.set with full key', async () => {
    redisService.getFullKey.mockReturnValue('prefix:key');
    await service.set('key', '$', { foo: 'bar' } as any);
    expect(redisService.getFullKey).toHaveBeenCalledWith('key');
    expect(redisService.client.json.set).toHaveBeenCalledWith(
      'prefix:key',
      '$',
      { foo: 'bar' },
    );
  });

  it('merge should call json.merge with full key', async () => {
    redisService.getFullKey.mockReturnValue('prefix:key');
    await service.merge('key', '$', { a: 1 } as any);
    expect(redisService.getFullKey).toHaveBeenCalledWith('key');
    expect(redisService.client.json.merge).toHaveBeenCalledWith(
      'prefix:key',
      '$',
      { a: 1 },
    );
  });

  it('get should call json.get with full key and path', async () => {
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

  it('del should call json.del with full key and path', async () => {
    redisService.getFullKey.mockReturnValue('prefix:key');
    await service.del('key', '$');
    expect(redisService.getFullKey).toHaveBeenCalledWith('key');
    expect(redisService.client.json.del).toHaveBeenCalledWith(
      'prefix:key',
      '$',
    );
  });
});
