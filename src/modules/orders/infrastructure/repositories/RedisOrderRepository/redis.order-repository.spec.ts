// src/order/infrastructure/__tests__/redis-order.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { CreateOrderDto } from '../../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../../presentation/dto/update-order.dto';
import { OrderStatus } from '../../../domain/value-objects/order-status';
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
        lineTotal: 21.0,
      },
    ],
    status: OrderStatus.PENDING,
    totalPrice: 21.0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCreateOrderDto: CreateOrderDto = {
    customerId: 'customer-123',
    items: [
      {
        productId: 'product-1',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 10.5,
        lineTotal: 21.0,
      },
    ],
    status: OrderStatus.PENDING,
  };

  const mockUpdateOrderDto: UpdateOrderDto = {
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
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisOrderRepository,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: OrderRepository,
          useValue: mockPostgresRepo,
        },
      ],
    }).compile();

    repository = module.get<RedisOrderRepository>(RedisOrderRepository);
    cacheService = module.get(CacheService);
    postgresRepo = module.get(OrderRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save order to postgres and cache successfully', async () => {
      // Arrange
      const saveResult = Result.success<IOrder>(mockOrder);
      postgresRepo.save.mockResolvedValue(saveResult);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      // Act
      const result = await repository.save(mockCreateOrderDto);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);
      expect(postgresRepo.save).toHaveBeenCalledWith(mockCreateOrderDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
        mockOrder,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure when postgres save fails', async () => {
      // Arrange
      const error = new RepositoryError('Postgres save failed');
      const saveResult = Result.failure<RepositoryError>(error);
      postgresRepo.save.mockResolvedValue(saveResult);

      // Act
      const result = await repository.save(mockCreateOrderDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache service errors gracefully', async () => {
      // Arrange
      const saveResult = Result.success<IOrder>(mockOrder);
      postgresRepo.save.mockResolvedValue(saveResult);
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await repository.save(mockCreateOrderDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Failed to save order');
      }
    });
  });

  describe('update', () => {
    const orderId = '123e4567-e89b-12d3-a456-426614174000';
    const updatedOrder = { ...mockOrder, status: OrderStatus.PAID };

    it('should update order in postgres and cache successfully', async () => {
      // Arrange
      const updateResult = Result.success<IOrder>(updatedOrder);
      postgresRepo.update.mockResolvedValue(updateResult);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      // Act
      const result = await repository.update(orderId, mockUpdateOrderDto);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(updatedOrder);
      expect(postgresRepo.update).toHaveBeenCalledWith(
        orderId,
        mockUpdateOrderDto,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${orderId}`,
        updatedOrder,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure when postgres update fails', async () => {
      // Arrange
      const error = new RepositoryError('Update failed');
      const updateResult = Result.failure<RepositoryError>(error);
      postgresRepo.update.mockResolvedValue(updateResult);

      // Act
      const result = await repository.update(orderId, mockUpdateOrderDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache service errors during update', async () => {
      // Arrange
      const updateResult = Result.success<IOrder>(updatedOrder);
      postgresRepo.update.mockResolvedValue(updateResult);
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await repository.update(orderId, mockUpdateOrderDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error).toBeInstanceOf(RepositoryError);
    });
  });

  describe('findById', () => {
    const orderId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return cached order when available', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(mockOrder);

      // Act
      const result = await repository.findById(orderId);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);
      expect(cacheService.get).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${orderId}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache when not in cache', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      const dbResult = Result.success<IOrder>(mockOrder);
      postgresRepo.findById.mockResolvedValue(dbResult);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await repository.findById(orderId);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrder);
      expect(postgresRepo.findById).toHaveBeenCalledWith(orderId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${orderId}`,
        mockOrder,
        { ttl: Order_REDIS.EXPIRATION },
      );
    });

    it('should return failure when postgres findById fails', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      const error = new RepositoryError('Order not found');
      const dbResult = Result.failure<RepositoryError>(error);
      postgresRepo.findById.mockResolvedValue(dbResult);

      // Act
      const result = await repository.findById(orderId);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle cache service errors during findById', async () => {
      // Arrange
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await repository.findById(orderId);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error).toBeInstanceOf(RepositoryError);
    });
  });

  describe('findAll', () => {
    const mockOrders = [mockOrder, { ...mockOrder, id: 'order-2' }];

    it('should return cached orders when cache flag is set', async () => {
      // Arrange
      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue(mockOrders);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrders);
      expect(cacheService.get).toHaveBeenCalledWith(Order_REDIS.IS_CACHED_FLAG);
      expect(cacheService.getAll).toHaveBeenCalledWith(Order_REDIS.INDEX);
      expect(postgresRepo.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache when cache flag is not set', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      const dbResult = Result.success<IOrder[]>(mockOrders);
      postgresRepo.findAll.mockResolvedValue(dbResult);
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      const expectedCacheEntries = mockOrders.map((order) => ({
        key: `${Order_REDIS.CACHE_KEY}:${order.id}`,
        value: order,
      }));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockOrders);
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalledWith(expectedCacheEntries, {
        ttl: Order_REDIS.EXPIRATION,
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Order_REDIS.EXPIRATION },
      );
    });

    it('should return failure when postgres findAll fails', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      const error = new RepositoryError('Database error');
      const dbResult = Result.failure<RepositoryError>(error);
      postgresRepo.findAll.mockResolvedValue(dbResult);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });

    it('should handle cache service errors during findAll', async () => {
      // Arrange
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error).toBeInstanceOf(RepositoryError);
    });
  });

  describe('deleteById', () => {
    const orderId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete order from postgres and cache successfully', async () => {
      // Arrange
      const deleteResult = Result.success<void>(undefined);
      postgresRepo.deleteById.mockResolvedValue(deleteResult);
      cacheService.delete.mockResolvedValue(undefined);

      // Act
      const result = await repository.deleteById(orderId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(postgresRepo.deleteById).toHaveBeenCalledWith(orderId);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${orderId}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure when postgres delete fails', async () => {
      // Arrange
      const error = new RepositoryError('Delete failed');
      const deleteResult = Result.failure<RepositoryError>(error);
      postgresRepo.deleteById.mockResolvedValue(deleteResult);

      // Act
      const result = await repository.deleteById(orderId);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure) expect(result.error).toEqual(error);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should handle cache service errors during delete', async () => {
      // Arrange
      const deleteResult = Result.success<void>(undefined);
      postgresRepo.deleteById.mockResolvedValue(deleteResult);
      cacheService.delete.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await repository.deleteById(orderId);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error).toBeInstanceOf(RepositoryError);
    });
  });

  describe('Error Handling', () => {
    it('should use ErrorFactory for repository errors', async () => {
      // Arrange
      const originalError = new Error('Database connection failed');
      postgresRepo.save.mockRejectedValue(originalError);

      // Spy on ErrorFactory
      const errorFactorySpy = jest.spyOn(ErrorFactory, 'RepositoryError');

      // Act
      const result = await repository.save(mockCreateOrderDto);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(errorFactorySpy).toHaveBeenCalledWith(
        'Failed to save order',
        originalError,
      );
    });

    it('should handle unexpected errors in all methods', async () => {
      const methods = [
        { method: 'save', args: [mockCreateOrderDto] },
        { method: 'update', args: ['test-id', mockUpdateOrderDto] },
        { method: 'findById', args: ['test-id'] },
        { method: 'findAll', args: [] },
        { method: 'deleteById', args: ['test-id'] },
      ];

      for (const { method, args } of methods) {
        // Arrange
        postgresRepo.save.mockRejectedValue(
          new RepositoryError('Unexpected error'),
        );

        // Act
        const result = await (repository as any)[method](...args);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(RepositoryError);
      }
    });
  });

  describe('Cache Key Generation', () => {
    it('should use correct cache keys for different operations', async () => {
      const orderId = 'test-order-id';

      // Test findById cache key
      cacheService.get.mockResolvedValue(mockOrder);
      await repository.findById(orderId);
      expect(cacheService.get).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${orderId}`,
      );

      // Test save cache key
      const saveResult = Result.success<IOrder>(mockOrder);
      postgresRepo.save.mockResolvedValue(saveResult);
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      await repository.save(mockCreateOrderDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${mockOrder.id}`,
        mockOrder,
        { ttl: Order_REDIS.EXPIRATION },
      );
    });
  });
});
