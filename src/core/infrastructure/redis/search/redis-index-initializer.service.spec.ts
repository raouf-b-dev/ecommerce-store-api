import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisIndexInitializerService } from './redis-index-initializer.service';
import { RedisSearchClient } from '../clients/redis-search.client';
import {
  OrderIndexSchema,
  InventoryIndexSchema,
  ProductIndexSchema,
  CartIndexSchema,
  PaymentIndexSchema,
  CustomerIndexSchema,
  UserIndexSchema,
} from '../constants/redis.schemas';
import {
  INVENTORY_REDIS,
  ORDER_REDIS,
  PRODUCT_REDIS,
  CART_REDIS,
  PAYMENT_REDIS,
  CUSTOMER_REDIS,
  USER_REDIS,
} from '../constants/redis.constants';

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

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call createIndex for all modules on module init', async () => {
    await service.onModuleInit();

    expect(redisSearch.createIndex).toHaveBeenCalledTimes(7);

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      1,
      ORDER_REDIS.INDEX,
      OrderIndexSchema,
      `${ORDER_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      2,
      PRODUCT_REDIS.INDEX,
      ProductIndexSchema,
      `${PRODUCT_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      3,
      INVENTORY_REDIS.INDEX,
      InventoryIndexSchema,
      `${INVENTORY_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      4,
      CART_REDIS.INDEX,
      CartIndexSchema,
      `${CART_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      5,
      PAYMENT_REDIS.INDEX,
      PaymentIndexSchema,
      `${PAYMENT_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      6,
      CUSTOMER_REDIS.INDEX,
      CustomerIndexSchema,
      `${CUSTOMER_REDIS.CACHE_KEY}:`,
    );

    expect(redisSearch.createIndex).toHaveBeenNthCalledWith(
      7,
      USER_REDIS.INDEX,
      UserIndexSchema,
      `${USER_REDIS.CACHE_KEY}:`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      1,
      `Redis index '${ORDER_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      2,
      `Redis index '${PRODUCT_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      3,
      `Redis index '${INVENTORY_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      4,
      `Redis index '${CART_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      5,
      `Redis index '${PAYMENT_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      6,
      `Redis index '${CUSTOMER_REDIS.INDEX}' created/ensured`,
    );

    expect(loggerLogSpy).toHaveBeenNthCalledWith(
      7,
      `Redis index '${USER_REDIS.INDEX}' created/ensured`,
    );
  });

  it('should log "already exists" if order index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${ORDER_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if product index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${PRODUCT_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if inventory index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${INVENTORY_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if cart index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${CART_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if payment index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${PAYMENT_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if customer index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'))
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${CUSTOMER_REDIS.INDEX}' already exists`,
    );
  });

  it('should log "already exists" if user index already exists', async () => {
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Index already exists'));

    await service.onModuleInit();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      `Redis index '${USER_REDIS.INDEX}' already exists`,
    );
  });

  it('should log an error if order index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected order error');
    (redisSearch.createIndex as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${ORDER_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if product index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected product error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${PRODUCT_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if inventory index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected inventory error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${INVENTORY_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if cart index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected cart error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${CART_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if payment index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected payment error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${PAYMENT_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if customer index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected customer error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${CUSTOMER_REDIS.INDEX}'`,
      error,
    );
  });

  it('should log an error if user index creation fails unexpectedly', async () => {
    const error = new Error('Unexpected user error');
    (redisSearch.createIndex as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error);

    await service.onModuleInit();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to create index '${USER_REDIS.INDEX}'`,
      error,
    );
  });
});
