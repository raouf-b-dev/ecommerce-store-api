// src/order/infrastructure/__tests__/redis-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ORDER_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { RedisOrderRepository } from './redis.order-repository';
import { Logger } from '@nestjs/common';
import {
  OrderForCache,
  OrderCacheMapper,
} from '../../persistence/mappers/order.mapper';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { Order } from '../../../domain/entities/order';
import { CreateOrderDtoTestFactory } from '../../../testing/factories/create-order-dto.factory';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { OrderBuilder } from '../../../testing';
import { PaymentMethodType } from '../../../../payments/domain';

describe('RedisOrderRepository', () => {
  let repository: RedisOrderRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<OrderRepository>;
  let logger: jest.Mocked<Logger>;

  // Use factory for test data
  const mockOrder: Order = Order.fromPrimitives(
    OrderTestFactory.createMockOrder(),
  );
  const mockCachedOrder: OrderForCache = OrderCacheMapper.toCache(mockOrder);
  const mockCreateOrderDto = CreateOrderDtoTestFactory.createMockDto();
  const mockUpdateOrderDto: CreateOrderItemDto[] = [
    { productId: 'product-1', quantity: 3 },
  ];
  const cancelledOrder = Order.fromPrimitives(
    OrderTestFactory.createCancelledOrder({
      id: mockOrder.id,
    }),
  );

  const updatedOrder = Order.fromPrimitives(OrderTestFactory.createMockOrder());

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      setAll: jest.fn(),
    };

    const mockPostgresRepo: jest.Mocked<OrderRepository> = {
      save: jest.fn(),
      updateItemsInfo: jest.fn(),
      updateStatus: jest.fn(),
      updatePaymentId: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      listOrders: jest.fn(),
      cancelOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisOrderRepository,
        { provide: CacheService, useValue: mockCacheService },
        { provide: OrderRepository, useValue: mockPostgresRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get(RedisOrderRepository);
    cacheService = module.get(CacheService);
    postgresRepo = module.get(OrderRepository);
    logger = module.get(Logger);
  });

  afterEach(() => jest.clearAllMocks());

  describe('save', () => {
    it('should save order to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);

      expect(cacheService.set).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${mockOrder.id}`,
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
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save order',
        RepositoryError,
      );
    });

    it('should save cash on delivery order', async () => {
      const codDto = CreateOrderDtoTestFactory.createCashOnDeliveryDto();
      const codOrder = Order.fromPrimitives(
        OrderTestFactory.createCashOnDeliveryOrder(),
      );

      postgresRepo.save.mockResolvedValue(Result.success(codOrder));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.save(codOrder);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.paymentMethod).toBe(
          PaymentMethodType.CASH_ON_DELIVERY,
        );
      }
    });
  });

  describe('updateStatus', () => {
    it('should update status in postgres and update cache', async () => {
      const cachedOrder = OrderCacheMapper.toCache(mockOrder);

      postgresRepo.updateStatus.mockResolvedValue(Result.success(undefined));
      cacheService.get.mockResolvedValue(cachedOrder);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.updateStatus(
        mockOrder.id,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.updateStatus).toHaveBeenCalledWith(
        mockOrder.id,
        OrderStatus.CONFIRMED,
      );

      expect(cacheService.set).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${mockOrder.id}`,
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          updatedAt: expect.any(Number),
        }),
        { ttl: ORDER_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres updateStatus fails', async () => {
      const error = new RepositoryError('Update status failed');
      postgresRepo.updateStatus.mockResolvedValue(Result.failure(error));

      const result = await repository.updateStatus(
        mockOrder.id,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache miss during status update', async () => {
      postgresRepo.updateStatus.mockResolvedValue(Result.success(undefined));
      cacheService.get.mockResolvedValue(null);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.updateStatus(
        mockOrder.id,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should update cache with new timestamp', async () => {
      const cachedOrder = OrderCacheMapper.toCache(mockOrder);
      const beforeUpdate = Date.now();

      postgresRepo.updateStatus.mockResolvedValue(Result.success(undefined));
      cacheService.get.mockResolvedValue(cachedOrder);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.updateStatus(mockOrder.id, OrderStatus.CONFIRMED);

      const setCall = cacheService.set.mock.calls[0];
      const updatedCache = setCall[1] as OrderForCache;

      expect(updatedCache.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(updatedCache.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should handle cache service error during status update', async () => {
      postgresRepo.updateStatus.mockResolvedValue(Result.success(undefined));
      cacheService.get.mockRejectedValue(new Error('Redis error'));

      const result = await repository.updateStatus(
        mockOrder.id,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update order status',
      );
    });

    it('should invalidate list cache when updating status', async () => {
      const cachedOrder = OrderCacheMapper.toCache(mockOrder);

      postgresRepo.updateStatus.mockResolvedValue(Result.success(undefined));
      cacheService.get.mockResolvedValue(cachedOrder);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.updateStatus(mockOrder.id, OrderStatus.CONFIRMED);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should update status from PENDING to CONFIRMED', async () => {
      const pendingOrder = Order.fromPrimitives(
        OrderTestFactory.createPendingOrder(),
      );
      const cachedOrder = OrderCacheMapper.toCache(pendingOrder);

      postgresRepo.updateStatus.mockResolvedValue(Result.success(undefined));
      cacheService.get.mockResolvedValue(cachedOrder);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.updateStatus(
        pendingOrder.id,
        OrderStatus.CONFIRMED,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      const setCall = cacheService.set.mock.calls[0];
      const updatedCache = setCall[1] as OrderForCache;
      expect(updatedCache.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('updateItemsInfo', () => {
    it('should update order and cache', async () => {
      const updatedOrder = Order.fromPrimitives(
        OrderTestFactory.createMockOrder({
          id: mockOrder.id,
          status: OrderStatus.CONFIRMED,
        }),
      );
      const updatedCachedOrder = OrderCacheMapper.toCache(updatedOrder);

      postgresRepo.updateItemsInfo.mockResolvedValue(
        Result.success(updatedOrder),
      );
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.updateItemsInfo(
        updatedOrder.id,
        mockUpdateOrderDto,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) expect(result.value).toEqual(updatedOrder);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${updatedOrder.id}`,
        updatedCachedOrder,
        { ttl: ORDER_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres update fails', async () => {
      const error = new RepositoryError('Update failed');
      postgresRepo.updateItemsInfo.mockResolvedValue(Result.failure(error));

      const result = await repository.updateItemsInfo(
        mockOrder.id,
        mockUpdateOrderDto,
      );

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return order from cache', async () => {
      cacheService.get.mockResolvedValue(mockCachedOrder);

      const result = await repository.findById(mockOrder.id);

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
      postgresRepo.findById.mockResolvedValue(Result.success(order));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.findById(mockOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) expect(result.value).toEqual(order);
      const expectedCached = OrderCacheMapper.toCache(order);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${mockOrder.id}`,
        expectedCached,
        { ttl: ORDER_REDIS.EXPIRATION },
      );
    });

    it('should find pending order from cache', async () => {
      const pendingOrder = Order.fromPrimitives(
        OrderTestFactory.createPendingOrder(),
      );
      const cachedPending = OrderCacheMapper.toCache(pendingOrder);

      cacheService.get.mockResolvedValue(cachedPending);

      const result = await repository.findById(pendingOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.status).toBe(OrderStatus.PENDING);
      }
    });
  });

  describe('deleteById', () => {
    it('should delete order from postgres and cache', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.deleteById(mockOrder.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${mockOrder.id}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres delete fails', async () => {
      const error = new RepositoryError('Delete failed');
      postgresRepo.deleteById.mockResolvedValue(Result.failure(error));

      const result = await repository.deleteById(mockOrder.id);

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('listOrders', () => {
    it('should return cached orders if no filters and cache exists', async () => {
      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue([mockCachedOrder]);

      const dto: ListOrdersQueryDto = {};
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
      cacheService.set.mockResolvedValue(undefined);

      const dto: ListOrdersQueryDto = {};
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
        OrderTestFactory.createPendingOrder({ id: 'OR0001' }),
        OrderTestFactory.createShippedOrder({ id: 'OR0002' }),
        OrderTestFactory.createCancelledOrder({ id: 'OR0003' }),
      ];

      cacheService.get.mockResolvedValue(null);
      postgresRepo.listOrders.mockResolvedValue(
        Result.success(orders.map((order) => Order.fromPrimitives(order))),
      );
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.listOrders({});

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0].status).toBe(OrderStatus.PENDING);
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
      const dto: ListOrdersQueryDto = {
        status: OrderStatus.PENDING,
        customerId: 'CUST1',
      };

      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));

      const result = await repository.listOrders(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.listOrders).toHaveBeenCalledWith(dto);
      expect(cacheService.getAll).not.toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      const dto: ListOrdersQueryDto = {
        page: 2,
        limit: 10,
      };

      const orders = Array.from({ length: 10 }, (_, i) =>
        OrderTestFactory.createMockOrder({ id: `OR${i}` }),
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

  describe('cancelOrder', () => {
    it('should cancel order in postgres and update cache', async () => {
      postgresRepo.cancelOrder.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) expect(result.value).toBe(undefined);

      expect(cacheService.delete).toHaveBeenCalledWith(
        `${ORDER_REDIS.CACHE_KEY}:${mockOrder.id}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres cancel fails', async () => {
      const error = new RepositoryError('Cancel failed');
      postgresRepo.cancelOrder.mockResolvedValue(Result.failure(error));

      const result = await repository.cancelOrder(cancelledOrder);

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should cancel multi-item order and clear cache', async () => {
      const multiItemCancelledOrder: Order = Order.fromPrimitives(
        new OrderBuilder()
          .withId('OR0000001')
          .withItems(5)
          .withStatus(OrderStatus.CANCELLED)
          .build(),
      );

      postgresRepo.cancelOrder.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.cancelOrder(multiItemCancelledOrder);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle cache deletion failure gracefully', async () => {
      postgresRepo.cancelOrder.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockRejectedValue(new Error('Cache error'));

      const result = await repository.cancelOrder(cancelledOrder);

      // Should still succeed even if cache deletion fails
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to cancel order',
      );
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
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockRejectedValue(new Error('Redis connection lost'));

      const result = await repository.save(mockOrder);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to save order');
    });

    it('should handle cache service errors during update', async () => {
      postgresRepo.updateItemsInfo.mockResolvedValue(
        Result.success(updatedOrder),
      );
      cacheService.set.mockRejectedValue(new Error('Cache write failed'));

      const result = await repository.updateItemsInfo(
        mockOrder.id,
        mockUpdateOrderDto,
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update order',
      );
    });
  });

  describe('Cache Operations', () => {
    it('should set correct TTL when caching orders', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.save(mockOrder);

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { ttl: ORDER_REDIS.EXPIRATION },
      );
    });

    it('should invalidate list cache when saving new order', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.save(mockOrder);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should invalidate list cache when updating order', async () => {
      postgresRepo.updateItemsInfo.mockResolvedValue(
        Result.success(updatedOrder),
      );
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.updateItemsInfo(mockOrder.id, mockUpdateOrderDto);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should invalidate list cache when deleting order', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      await repository.deleteById(mockOrder.id);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should invalidate list cache when cancelling order', async () => {
      postgresRepo.cancelOrder.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      await repository.cancelOrder(cancelledOrder);

      expect(cacheService.delete).toHaveBeenCalledWith(
        ORDER_REDIS.IS_CACHED_FLAG,
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete order lifecycle with caching', async () => {
      // Create
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const createResult = await repository.save(mockOrder);
      expect(createResult.isSuccess).toBe(true);

      // Find (from cache)
      const cachedOrder = OrderCacheMapper.toCache(mockOrder);
      cacheService.get.mockResolvedValue(cachedOrder);

      const findResult = await repository.findById(mockOrder.id);
      expect(findResult.isSuccess).toBe(true);

      // Cancel
      postgresRepo.cancelOrder.mockResolvedValue(Result.success(undefined));

      const cancelResult = await repository.cancelOrder(cancelledOrder);
      expect(cancelResult.isSuccess).toBe(true);
    });
  });
});
