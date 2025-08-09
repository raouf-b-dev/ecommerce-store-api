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
            getFullKey: jest.fn(),
            client: {
              ft: {
                search: jest.fn(),
                create: jest.fn(),
              },
            },
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

  it('search should call getFullKey and client.ft.search', async () => {
    redisService.getFullKey.mockReturnValue('prefix:index');
    (redisService.client.ft.search as jest.Mock).mockResolvedValue({
      documents: [],
    });

    const options = { LIMIT: { from: 0, size: 10 } };
    const result = await service.search('index', '*', options);

    expect(redisService.getFullKey).toHaveBeenCalledWith('index');
    expect(redisService.client.ft.search).toHaveBeenCalledWith(
      'prefix:index',
      '*',
      options,
    );
    expect(result).toEqual({ documents: [] });
  });

  it('createIndex should call getFullKey for index and prefix and then client.ft.create', async () => {
    redisService.getFullKey
      .mockImplementationOnce((key) => `prefix:${key}`) // index
      .mockImplementationOnce((key) => `prefix:${key}`); // prefix

    const schema = { name: { type: 'TEXT' } };

    await service.createIndex('myIndex', schema, 'myPrefix');

    expect(redisService.getFullKey).toHaveBeenNthCalledWith(1, 'myIndex');
    expect(redisService.getFullKey).toHaveBeenNthCalledWith(2, 'myPrefix');
    expect(redisService.client.ft.create).toHaveBeenCalledWith(
      'prefix:myIndex',
      schema,
      {
        ON: 'JSON',
        PREFIX: ['prefix:myPrefix'],
      },
    );
  });
});
