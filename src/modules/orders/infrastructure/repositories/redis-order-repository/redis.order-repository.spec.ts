// src/order/infrastructure/__tests__/redis-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { AggregatedOrderInput } from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { RedisOrderRepository } from './redis.order-repository';
import { Logger } from '@nestjs/common';
import {
  OrderForCache,
  OrderCacheMapper,
} from '../../persistence/mappers/order.mapper';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../../domain/value-objects/payment-status';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { Order } from '../../../domain/entities/order';

describe('RedisOrderRepository', () => {
  let repository: RedisOrderRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<OrderRepository>;
  let logger: jest.Mocked<Logger>;

  const mockOrder: IOrder = {
    id: 'OR0001',
    customerId: 'CUST1',
    paymentInfoId: 'PAY001',
    shippingAddressId: 'ADDR001',

    items: [
      {
        id: 'item-1',
        productId: 'PR1',
        productName: 'P1',
        quantity: 1,
        unitPrice: 10,
        lineTotal: 10,
      },
    ],

    customerInfo: {
      customerId: 'CUST1',
      email: 'customer@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
    },

    paymentInfo: {
      id: 'PAY001',
      method: PaymentMethod.CREDIT_CARD,
      amount: 15,
      status: PaymentStatus.PENDING,
      transactionId: 'TXN123456',
      notes: 'Awaiting payment confirmation',
    },

    shippingAddress: {
      id: 'ADDR001',
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'DZ',
      phone: '+1234567890',
    },

    subtotal: 10,
    shippingCost: 5,
    totalPrice: 15,

    status: OrderStatus.PENDING,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),

    customerNotes: 'Please ring doorbell upon delivery',
  };

  const mockCachedOrder: OrderForCache = OrderCacheMapper.toCache(mockOrder);

  const mockCreateOrderDto: AggregatedOrderInput = {
    customerInfo: mockOrder.customerInfo,
    shippingAddress: mockOrder.shippingAddress,
    paymentInfo: mockOrder.paymentInfo,
    items: mockOrder.items,
  };

  const mockUpdateOrderDto: CreateOrderItemDto[] = [
    { productId: 'product-1', quantity: 3 },
  ];

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

      const result = await repository.save(mockCreateOrderDto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);

      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
        OrderCacheMapper.toCache(mockOrder),
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres save fails', async () => {
      const error = new RepositoryError('Postgres save failed');
      postgresRepo.save.mockResolvedValue(Result.failure(error));

      const result = await repository.save(mockCreateOrderDto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return failure if cache.set throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repository.save(mockCreateOrderDto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Failed to save order');
      }
    });
  });

  describe('update', () => {
    const updatedOrder: IOrder = { ...mockOrder, status: OrderStatus.PAID };
    const updatedCachedOrder = OrderCacheMapper.toCache(updatedOrder);

    it('should update order and cache', async () => {
      postgresRepo.updateItemsInfo.mockResolvedValue(
        Result.success(updatedOrder),
      );
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.updateItemsInfo(
        updatedOrder.id,
        mockUpdateOrderDto,
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(updatedOrder);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${updatedOrder.id}`,
        updatedCachedOrder,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres update fails', async () => {
      const error = new RepositoryError('Update failed');
      postgresRepo.updateItemsInfo.mockResolvedValue(Result.failure(error));

      const result = await repository.updateItemsInfo(
        updatedOrder.id,
        mockUpdateOrderDto,
      );

      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return order from cache', async () => {
      cacheService.get.mockResolvedValue(mockCachedOrder);

      const result = await repository.findById(mockOrder.id);

      expect(result.isSuccess).toBe(true);
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

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(order);
      const expectedCached = OrderCacheMapper.toCache(order.toPrimitives());
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
        expectedCached,
        { ttl: Order_REDIS.EXPIRATION },
      );
    });
  });

  describe('deleteById', () => {
    it('should delete order from postgres and cache', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.deleteById(mockOrder.id);

      expect(result.isSuccess).toBe(true);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres delete fails', async () => {
      const error = new RepositoryError('Delete failed');
      postgresRepo.deleteById.mockResolvedValue(Result.failure(error));

      const result = await repository.deleteById(mockOrder.id);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('ListOrders', () => {
    it('should return cached orders if no filters and cache exists', async () => {
      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue([mockCachedOrder]);

      const dto: ListOrdersQueryDto = {};
      const result = await repository.listOrders(dto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const expected = [
          OrderCacheMapper.fromCache(mockCachedOrder).toPrimitives(),
        ];
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

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual([mockOrder]);
      expect(cacheService.setAll).toHaveBeenCalled();

      expect(cacheService.set).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Order_REDIS.EXPIRATION },
      );
    });

    it('should log a warning if cache lookup fails', async () => {
      cacheService.get.mockRejectedValue(new Error('Redis down'));
      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));

      const result = await repository.listOrders({});

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache lookup failed, falling back to database:',
        expect.any(Error),
      );
    });

    it('should log a warning if caching orders fails', async () => {
      cacheService.get.mockResolvedValue(null); // no cache hit
      postgresRepo.listOrders.mockResolvedValue(Result.success([mockOrder]));

      cacheService.setAll.mockRejectedValue(new Error('Redis write failed'));

      const result = await repository.listOrders({});

      expect(result.isSuccess).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to cache orders:',
        expect.any(Error),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors using ErrorFactory', async () => {
      const originalError = new Error('Unexpected');
      postgresRepo.save.mockRejectedValue(originalError);

      const spy = jest.spyOn(ErrorFactory, 'RepositoryError');
      const result = await repository.save(mockCreateOrderDto);

      expect(result.isFailure).toBe(true);
      expect(spy).toHaveBeenCalledWith('Failed to save order', originalError);
    });
  });

  describe('cancelOrder', () => {
    const cancelledOrder: Order = Order.fromPrimitives(mockOrder);
    cancelledOrder.cancel();
    it('should cancel order in postgres and update cache', async () => {
      postgresRepo.cancelOrder.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.cancelOrder(cancelledOrder);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toBe(undefined);

      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres cancel fails', async () => {
      const cancelledOrder: Order = Order.fromPrimitives(mockOrder);
      cancelledOrder.cancel();

      const error = new RepositoryError('Cancel failed');
      postgresRepo.cancelOrder.mockResolvedValue(Result.failure(error));

      const result = await repository.cancelOrder(cancelledOrder);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });
});
