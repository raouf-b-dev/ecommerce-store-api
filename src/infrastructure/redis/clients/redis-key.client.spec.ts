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
            ttl: jest.fn(),
            expire: jest.fn(),
            exists: jest.fn(),
            createPipeline: jest.fn(),
            scanKeys: jest.fn(),
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

  it('ttl delegates to redisService.ttl', async () => {
    redisService.ttl.mockResolvedValue(100);
    await expect(service.ttl('key')).resolves.toBe(100);
    expect(redisService.ttl).toHaveBeenCalledWith('key');
  });

  it('expire delegates to redisService.expire', async () => {
    redisService.expire.mockResolvedValue(1);
    await expect(service.expire('key', 500)).resolves.toBe(1);
    expect(redisService.expire).toHaveBeenCalledWith('key', 500);
  });

  it('exists delegates to redisService.exists', async () => {
    redisService.exists.mockResolvedValue(1);
    await expect(service.exists('key')).resolves.toBe(1);
    expect(redisService.exists).toHaveBeenCalledWith('key');
  });

  it('createPipeline delegates to redisService.createPipeline', () => {
    const pipeline = {};
    redisService.createPipeline.mockReturnValue(pipeline);
    expect(service.createPipeline()).toBe(pipeline);
  });

  it('scanKeys delegates to redisService.scanKeys', async () => {
    redisService.scanKeys.mockResolvedValue(['key1']);
    await expect(service.scanKeys('pattern', 50)).resolves.toEqual(['key1']);
    expect(redisService.scanKeys).toHaveBeenCalledWith('pattern', 50);
  });
});
