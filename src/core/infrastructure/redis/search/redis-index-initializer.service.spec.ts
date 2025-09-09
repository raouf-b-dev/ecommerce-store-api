import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisIndexInitializerService } from './redis-index-initializer.service';
import { RedisSearchClient } from '../clients/redis-search.client';
import {
  OrderIndexSchema,
  ProductIndexSchema,
} from '../constants/redis.schemas';
import { Order_REDIS, Product_REDIS } from '../constants/redis.constants';

describe('RedisIndexInitializerService', () => {
  let service: RedisIndexInitializerService;
  let redisSearch: jest.Mocked<RedisSearchClient>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisIndexInitializerService,
        {
          provide: RedisSearchClient,
          useValue: {
            createIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RedisIndexInitializerService);
    redisSearch = module.get(RedisSearchClient);

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call createIndex for both order and product on module init', async () => {
    await service.onModuleInit();

    expect(redisSearch.createIndex).toHaveBeenCalledTimes(2);

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      1,
      Order_REDIS.INDEX,
      OrderIndexSchema,
      `${Order_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      2,
      Product_REDIS.INDEX,
      ProductIndexSchema,
      `${Product_REDIS.CACHE_KEY}:`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      1,
      `Redis index '${Order_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      2,
      `Redis index '${Product_REDIS.INDEX}' created/ensured`,
    );
  });

  it('should log "already exists" if order index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValueOnce(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${Order_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if product index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'));

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${Product_REDIS.INDEX}' already exists`,
    );
  });

  it('should log an error if order index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected order error');
    (redisSearch.createIndex as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${Order_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if product index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected product error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${Product_REDIS.INDEX}'`,
      error,
    );
  });
});
