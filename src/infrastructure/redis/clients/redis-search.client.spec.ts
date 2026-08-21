import { Test, TestingModule } from '@nestjs/testing';
import { RedisSearchClient } from './redis-search.client';
import { RedisService } from '../redis.service';
import { MockRedisService } from '../testing';

describe('RedisSearchClient', () => {
  let service: RedisSearchClient;
  let redisService: MockRedisService;

  beforeEach(async () => {
    redisService = new MockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisSearchClient,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get(RedisSearchClient);
  });

  afterEach(() => {
    redisService.reset();
  });

  it('search delegates to redisService.search', async () => {
    const options = { LIMIT: { from: 0, size: 10 } };
    const response = { total: 0, documents: [] };
    redisService.search.mockResolvedValue(response);

    await expect(service.search('index', '*', options)).resolves.toEqual(
      response,
    );
    expect(redisService.search).toHaveBeenCalledWith('index', '*', options);
  });

  it('createIndex delegates to redisService.createIndex', async () => {
    const schema = { name: { type: 'TEXT' } };
    redisService.mockCreateIndexCreated();

    await expect(
      service.createIndex('myIndex', schema, 'myPrefix:'),
    ).resolves.toBe(true);
    expect(redisService.createIndex).toHaveBeenCalledWith(
      'myIndex',
      schema,
      'myPrefix:',
    );
  });
});
