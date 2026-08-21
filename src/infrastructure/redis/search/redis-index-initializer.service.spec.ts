import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisIndexInitializerService } from './redis-index-initializer.service';
import { RedisSearchClient } from '../clients/redis-search.client';
import { RedisService } from '../redis.service';
import { ORDER_REDIS } from '../constants/redis.constants';
import {
  MockRedisSearchClient,
  MockRedisService,
  RedisIndexTestFactory,
} from '../testing';

describe('RedisIndexInitializerService', () => {
  let service: RedisIndexInitializerService;
  let redisSearch: MockRedisSearchClient;
  let redisService: MockRedisService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const indexes = RedisIndexTestFactory.createDefinitions();

  beforeEach(async () => {
    redisSearch = new MockRedisSearchClient();
    redisService = new MockRedisService();

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisIndexInitializerService,
        { provide: RedisSearchClient, useValue: redisSearch },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get(RedisIndexInitializerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create all module indexes on init', async () => {
    await service.onModuleInit();

    expect(redisSearch.createIndex).toHaveBeenCalledTimes(indexes.length);
    for (const { index, schema, prefix } of indexes) {
      expect(redisSearch.createIndex).toHaveBeenCalledWith(
        index,
        schema,
        prefix,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Redis index '${index}' created`,
      );
    }
  });

  it('should log already exists when createIndex returns false', async () => {
    redisSearch.mockCreateIndexAlreadyExists();

    await service.onModuleInit();

    for (const { index } of indexes) {
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Redis index '${index}' already exists`,
      );
    }
  });

  it('should log an error when createIndex throws', async () => {
    const error = new Error('Unexpected order error');
    redisSearch.createIndex
      .mockRejectedValueOnce(error)
      .mockResolvedValue(true);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${ORDER_REDIS.INDEX}'`,
      error.stack,
    );
  });

  it('should skip index init when Redis is unavailable', async () => {
    redisService.mockUnavailable();

    await service.onModuleInit();

    expect(redisSearch.createIndex).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Redis unavailable — skipping RediSearch index initialization',
    );
  });
});
