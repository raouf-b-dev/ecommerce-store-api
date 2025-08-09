import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisIndexInitializerService } from './redis-index-initializer.service';
import { RedisSearchClient } from '../clients/redis-search.client';
import { OrderIndexSchema } from '../constants/redis.schemas';
import { Order_REDIS } from '../constants/redis.constants';

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

  it('should call createIndex on module init', async () => {
    await service.onModuleInit();

    expect(redisSearch.createIndex).toHaveBeenCalledWith(
      Order_REDIS.INDEX,
      OrderIndexSchema,
      `${Order_REDIS.CACHE_KEY}:`,
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${Order_REDIS.INDEX}' initialized`,
    );
  });

  it('should log "already exists" if error contains "Index already exists"', async () => {
    (redisSearch.createIndex as jest.Mock).mockRejectedValueOnce(
      new Error('Index already exists'),
    );

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${Order_REDIS.INDEX}' already exists`,
    );
  });

  it('should log an error if createIndex throws a different error', async () => {
    const error = new Error('Unexpected failure');
    (redisSearch.createIndex as jest.Mock).mockRejectedValueOnce(error);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${Order_REDIS.INDEX}'`,
      error,
    );
  });
});
