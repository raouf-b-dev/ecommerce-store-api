// src/order/infrastructure/__tests__/redis-order.repository.spec.ts
import {
  MockOrderRepository,
  OrderTestFactory,
} from 'src/modules/orders/testing';
import { MockCacheService, MockLogger } from 'src/testing';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ListOrdersQuery,
  OrderRepository,
} from '../../../core/domain/repositories/order-repository';
import { CachePort } from '../../../../../infrastructure/redis/cache/cache.port';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ORDER_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import { CachedOrderRepository } from './cached.order-repository';
import { Logger } from '@nestjs/common';
import {
  OrderForCache,
  OrderCacheMapper,
} from '../../persistence/mappers/order.mapper';
import { Order } from '../../../core/domain/entities/order';
import { ResultAssertionHelper } from '../../../../../testing';

describe('CachedOrderRepository', () => {
  let repository: CachedOrderRepository;
  let cacheService: MockCacheService;
  let postgresRepo: MockOrderRepository;
  let logger: MockLogger;

  // Use factory for test data
  const mockOrder: Order = Order.fromPrimitives(
    OrderTestFactory.createMockOrder(),
  );

  const orderId = 1;
  const mockCachedOrder: OrderForCache = OrderCacheMapper.toCache(mockOrder);

  const updatedOrder = Order.fromPrimitives(OrderTestFactory.createMockOrder());

  beforeEach(async () => {
    const mockLogger = new MockLogger();

    const mockCacheService = new MockCacheService();

    const mockPostgresRepo = new MockOrderRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CachedOrderRepository,
        { provide: CachePort, useValue: mockCacheService },
        { provide: OrderRepository, useValue: mockPostgresRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get(CachedOrderRepository);
    cacheService = module.get(CachePort);
    postgresRepo = module.get(OrderRepository);
    logger = module.get(Logger);
  });

  afterEach(() => jest.clearAllMocks());

  describe('save', () => {
    it('should save order to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultSuccess(result);

      expect(cacheService.set).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${orderId}`,
        OrderCacheMapper.toCache(mockOrder),
        { ttl: ORDER_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres save fails', async () => {
      const error = new RepositoryError('Postgres save failed');
      postgresRepo.save.mockResolvedValue(Result.failure(error));

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return failure if cache.set throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save order',
        RepositoryError,
      );
    });
  });

  describe('findById', () => {
    it('should return order from cache', async () => {
      cacheService.get.mockResolvedValue(mockCachedOrder);

      const result = await repository.findById(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        const expectedEntity = OrderCacheMapper.fromCache(mockCachedOrder);
        expect(result.value).toEqual(expectedEntity);
      }
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache if not cached', async () => {
      const order: Order = Order.fromPrimitives(mockOrder);
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockResolvedValue(true);

      const result = await repository.findById(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) expect(result.value).toEqual(order);
      const expectedCached = OrderCacheMapper.toCache(order);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${orderId}`,
        expectedCached,
        { ttl: ORDER_REDIS.EXPIRATION },
      );
    });

    it('should find pending order from cache', async () => {
      const pendingOrder = Order.fromPrimitives(
        OrderTestFactory.createPendingPaymentOrder(),
      );
      const cachedPending = OrderCacheMapper.toCache(pendingOrder);

      cacheService.get.mockResolvedValue(cachedPending);

      const result = await repository.findById(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.status).toBe(OrderStatus.PENDING_PAYMENT);
      }
    });
  });

  describe('deleteById', () => {
    it('should delete order from postgres and cache', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.deleteById(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${orderId}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres delete fails', async () => {
      const error = new RepositoryError('Delete failed');
      postgresRepo.deleteById.mockResolvedValue(Result.failure(error));

      const result = await repository.deleteById(orderId);

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('listOrders', () => {
    it('should return cached orders if no filters and cache exists', async () => {
      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue([mockCachedOrder]);

      const dto: ListOrdersQuery = {};
      const result = await repository.listOrders(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        const expected = [OrderCacheMapper.fromCache(mockCachedOrder)];
        expect(result.value).toEqual(expected);
      }
    });

    it('should fetch from postgres and cache if no cache', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(true);

      const dto: ListOrdersQuery = {};
      const result = await repository.listOrders(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) expect(result.value).toEqual([mockOrder]);
      expect(cacheService.setAll).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: ORDER_REDIS.EXPIRATION },
      );
    });

    it('should return multiple orders with different statuses', async () => {
      const orders = [
        OrderTestFactory.createPendingPaymentOrder({ id: 1 }),
        OrderTestFactory.createShippedOrder({ id: 2 }),
        OrderTestFactory.createCancelledOrder({ id: 3 }),
      ];

      cacheService.get.mockResolvedValue(null);
      postgresRepo.listOrders.mockResolvedValue(
        Result.success(orders.map((order) => Order.fromPrimitives(order))),
      );
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(true);

      const result = await repository.listOrders({});

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0].status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(result.value[1].status).toBe(OrderStatus.SHIPPED);
        expect(result.value[2].status).toBe(OrderStatus.CANCELLED);
      }
    });

    it('should log a warning if cache lookup fails', async () => {
      cacheService.get.mockRejectedValue(new Error('Redis down'));
      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));

      const result = await repository.listOrders({});

      ResultAssertionHelper.assertResultSuccess(result);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache lookup failed, falling back to database:',
        expect.any(Error),
      );
    });

    it('should log a warning if caching orders fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));
      cacheService.setAll.mockRejectedValue(new Error('Redis write failed'));

      const result = await repository.listOrders({});

      ResultAssertionHelper.assertResultSuccess(result);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to cache orders:',
        expect.any(Error),
      );
    });

    it('should fetch from postgres when filters are applied', async () => {
      const dto: ListOrdersQuery = {
        status: OrderStatus.PENDING_PAYMENT,
        userId: 1,
      };

      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));

      const result = await repository.listOrders(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.listOrders).toHaveBeenCalledWith(dto);
      expect(cacheService.getAll).not.toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      const dto: ListOrdersQuery = {
        page: 2,
        limit: 10,
      };

      const orders = Array.from({ length: 10 }, (_, i) =>
        OrderTestFactory.createMockOrder({ id: i }),
      );

      postgresRepo.listOrders.mockResolvedValue(
        Result.success(orders.map((order) => Order.fromPrimitives(order))),
      );

      const result = await repository.listOrders(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value).toHaveLength(10);
      }
    });
  });

  describe('findByIdForUpdate', () => {
    it('should delegate findByIdForUpdate to postgresRepo', async () => {
      postgresRepo.findByIdForUpdate.mockResolvedValue(
        Result.success({ entity: mockOrder, expectedVersion: 1 }),
      );

      const result = await repository.findByIdForUpdate(orderId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.entity).toEqual(mockOrder);
        expect(result.value.expectedVersion).toBe(1);
      }
      expect(postgresRepo.findByIdForUpdate).toHaveBeenCalledWith(orderId);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors using ErrorFactory', async () => {
      const originalError = new Error('Unexpected');
      postgresRepo.save.mockRejectedValue(originalError);

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save order',
        RepositoryError,
        originalError,
      );
    });

    it('should handle cache service errors during save', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockRejectedValue(new Error('Redis connection lost'));

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to save order');
    });
  });

  describe('Cache Operations', () => {
    it('should set correct TTL when caching orders', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.save(mockOrder);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { ttl: ORDER_REDIS.EXPIRATION },
      );
    });

    it('should invalidate list cache when saving order', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.save(mockOrder);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should invalidate list cache when deleting order', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      await repository.deleteById(orderId);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle order lifecycle with caching', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockResolvedValue(undefined);

      const createResult = await repository.save(mockOrder);
      expect(createResult.isSuccess).toBe(true);

      const cachedOrder = OrderCacheMapper.toCache(mockOrder);
      cacheService.get.mockResolvedValue(cachedOrder);

      const findResult = await repository.findById(orderId);
      expect(findResult.isSuccess).toBe(true);
    });
  });
});
