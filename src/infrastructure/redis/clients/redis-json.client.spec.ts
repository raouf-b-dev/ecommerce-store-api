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
            jsonSet: jest.fn(),
            jsonMerge: jest.fn(),
            jsonGet: jest.fn(),
            jsonMGet: jest.fn(),
            jsonDel: jest.fn(),
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

  it('set delegates to redisService.jsonSet', async () => {
    redisService.jsonSet.mockResolvedValue(true);

    const result = await service.set('key', '$', { foo: 'bar' }, { nx: true });

    expect(redisService.jsonSet).toHaveBeenCalledWith(
      'key',
      '$',
      { foo: 'bar' },
      { nx: true },
    );
    expect(result).toBe(true);
  });

  it('merge delegates to redisService.jsonMerge', async () => {
    await service.merge('key', '$', { a: 1 });
    expect(redisService.jsonMerge).toHaveBeenCalledWith('key', '$', { a: 1 });
  });

  it('get delegates to redisService.jsonGet', async () => {
    redisService.jsonGet.mockResolvedValue({ foo: 'bar' });
    const result = await service.get('key', '$');
    expect(redisService.jsonGet).toHaveBeenCalledWith('key', '$');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('mGet delegates to redisService.jsonMGet', async () => {
    redisService.jsonMGet.mockResolvedValue([{ foo: 'bar' }]);
    const result = await service.mGet(['key1'], '$');
    expect(redisService.jsonMGet).toHaveBeenCalledWith(['key1'], '$');
    expect(result).toEqual([{ foo: 'bar' }]);
  });

  it('del delegates to redisService.jsonDel', async () => {
    await service.del('key', '$');
    expect(redisService.jsonDel).toHaveBeenCalledWith('key', '$');
  });
});
