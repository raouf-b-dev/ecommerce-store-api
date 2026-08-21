import { Test, TestingModule } from '@nestjs/testing';
import { RedisSearchClient } from './redis-search.client';
import { RedisService } from '../redis.service';

describe('RedisSearchClient', () => {
  let service: RedisSearchClient;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisSearchClient,
        {
          provide: RedisService,
          useValue: {
            search: jest.fn(),
            createIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RedisSearchClient);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    await service.createIndex('myIndex', schema, 'myPrefix:');
    expect(redisService.createIndex).toHaveBeenCalledWith(
      'myIndex',
      schema,
      'myPrefix:',
    );
  });
});
