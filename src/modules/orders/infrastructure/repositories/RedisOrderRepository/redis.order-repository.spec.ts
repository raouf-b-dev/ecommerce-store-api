// src/order/infrastructure/redis-order.repository.spec.ts
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Order_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Order } from '../../../domain/entities/order';
import { RedisOrderRepository } from './redis.order-repository';

describe('RedisOrderRepository', () => {
  let repo: RedisOrderRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<OrderRepository>;
  let order: Order;
  let orders: Order[];

  beforeEach(() => {
    cacheService = {
      set: jest.fn(),
      setAll: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
    } as any;

    postgresRepo = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    } as any;

    repo = new RedisOrderRepository(cacheService, postgresRepo);

    order = { id: 1, name: 'Test Order', totalAmount: 100 } as unknown as Order;
    orders = [
      order,
      { id: 2, name: 'Another Order', totalAmount: 200 } as unknown as Order,
    ];
  });

  describe('save', () => {
    it('should save to postgres and cache, and invalidate list flag', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.save(order);

      expect(postgresRepo.save).toHaveBeenCalledWith(order);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${order.id}`,
        order,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres save fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.save.mockResolvedValue(fail);

      const result = await repo.save(order);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if cache set throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockRejectedValue(new Error('cache set error'));

      const result = await repo.save(order);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to save order');
      }
    });

    it('should return failure if IS_CACHED_FLAG deletion throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('flag delete error'));

      const result = await repo.save(order);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to save order');
      }
    });
  });

  describe('update', () => {
    it('should update to postgres and cache, and invalidate list flag', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.update(order);

      expect(postgresRepo.update).toHaveBeenCalledWith(order);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${order.id}`,
        order,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres update fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.update.mockResolvedValue(fail);

      const result = await repo.update(order);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if cache set throws', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockRejectedValue(new Error('cache set error'));

      const result = await repo.update(order);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to update order');
      }
    });

    it('should return failure if IS_CACHED_FLAG deletion throws', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('flag delete error'));

      const result = await repo.update(order);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to update order');
      }
    });
  });

  describe('findById', () => {
    it('should return cached order if found', async () => {
      cacheService.get.mockResolvedValue(order);

      const result = await repo.findById(order.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(order);
      }
      expect(cacheService.get).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${order.id}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(order));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findById(order.id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(order.id);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${order.id}`,
        order,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(order);
      }
    });

    it('should return failure if postgres fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(
        Result.failure(new RepositoryError('fail')),
      );

      const result = await repo.findById(order.id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(order.id);
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if caching fails after fetching from postgres', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(order));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.findById(order.id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(order.id);
      expect(cacheService.set).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find order');
      }
    });
  });

  describe('findAll', () => {
    it('should return cached Orders if IS_CACHED_FLAG is true', async () => {
      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue(orders);

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(Order_REDIS.IS_CACHED_FLAG);
      expect(cacheService.getAll).toHaveBeenCalledWith(Order_REDIS.INDEX);
      expect(postgresRepo.findAll).not.toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(orders);
      }
    });

    it('should fetch from postgres, cache orders and flag if IS_CACHED_FLAG is null', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(orders));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(Order_REDIS.IS_CACHED_FLAG);
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalledWith(
        orders.map((o) => ({
          key: `${Order_REDIS.CACHE_KEY}:${o.id}`,
          value: o,
        })),
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(orders);
      }
    });

    it('should return failure if postgres findAll fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(
        Result.failure(new RepositoryError('Postgres find all failed')),
      );

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(Order_REDIS.IS_CACHED_FLAG);
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        expect.any(String),
        expect.any(Object),
      );
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Postgres find all failed');
      }
    });

    it('should return failure if cache.setAll throws after postgres success', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(orders));
      cacheService.setAll.mockRejectedValue(new Error('Cache setAll failed'));

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(Order_REDIS.IS_CACHED_FLAG);
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        expect.any(String),
        expect.any(Object),
      );
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find all orders');
      }
    });

    it('should return failure if cache.set (for flag) throws after postgres success and setAll success', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(orders));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockRejectedValue(new Error('Cache flag set failed'));

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(Order_REDIS.IS_CACHED_FLAG);
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find all orders');
      }
    });
  });

  describe('deleteById', () => {
    it('should delete from postgres and cache, and clear the list flag', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(order.id);

      expect(postgresRepo.deleteById).toHaveBeenCalledWith(order.id);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}:${order.id}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Order_REDIS.IS_CACHED_FLAG,
      );
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres delete fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.deleteById.mockResolvedValue(fail);

      const result = await repo.deleteById(order.id);

      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if cache throws during individual order deletion', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === `${Order_REDIS.CACHE_KEY}:${order.id}`) {
          return Promise.reject(new Error('cache delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(order.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to delete order');
      }
    });

    it('should return failure if cache throws during IS_CACHED_FLAG deletion', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === Order_REDIS.IS_CACHED_FLAG) {
          return Promise.reject(new Error('flag delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(order.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to delete order');
      }
    });
  });
});
