// src/order/infrastructure/__tests__/redis-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
} from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { OrderMapper } from '../../utils/order.mapper';
import { OrderForCache } from '../../utils/order.type';
import { RedisOrderRepository } from './redis.order-repository';

describe('RedisOrderRepository', () => {
  let repository: RedisOrderRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<OrderRepository>;

  const mockOrder: IOrder = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    customerId: 'customer-123',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 10.5,
        lineTotal: 21,
      },
    ],
    status: OrderStatus.PENDING,
    totalPrice: 21,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCachedOrder: OrderForCache = OrderMapper.toCache(mockOrder);

  const mockCreateOrderDto: AggregatedOrderInput = {
    customerId: 'customer-123',
    items: mockOrder.items,
    status: mockOrder.status,
  };

  const mockUpdateOrderDto: AggregatedUpdateInput = {
    status: OrderStatus.PAID,
  };

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      setAll: jest.fn(),
    };
    const mockPostgresRepo = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      ListOrders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisOrderRepository,
        { provide: CacheService, useValue: mockCacheService },
        { provide: OrderRepository, useValue: mockPostgresRepo },
      ],
    }).compile();

    repository = module.get(RedisOrderRepository);
    cacheService = module.get(CacheService);
    postgresRepo = module.get(OrderRepository);
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
        mockCachedOrder,
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
    const updatedCachedOrder = OrderMapper.toCache(updatedOrder);

    it('should update order and cache', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(updatedOrder));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.update(
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
      postgresRepo.update.mockResolvedValue(Result.failure(error));

      const result = await repository.update(
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
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockOrder));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.findById(mockOrder.id);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
        mockCachedOrder,
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
      const result = await repository.ListOrders(dto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual([mockOrder]);
    });

    it('should fetch from postgres and cache if no cache', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.ListOrders.mockResolvedValue(Result.success([mockOrder]));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      const dto: ListOrdersQueryDto = {};
      const result = await repository.ListOrders(dto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual([mockOrder]);
      expect(cacheService.setAll).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Order_REDIS.EXPIRATION },
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
});
