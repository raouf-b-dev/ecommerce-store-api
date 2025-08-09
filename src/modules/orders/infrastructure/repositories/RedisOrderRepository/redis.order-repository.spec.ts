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

  beforeEach(() => {
    cacheService = {
      set: jest.fn(),
      get: jest.fn(),
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

    order = { id: 1, name: 'Test Order' } as unknown as Order;
  });

  describe('save', () => {
    it('should save to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.save(order);

      expect(postgresRepo.save).toHaveBeenCalledWith(order);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}${order.id}`,
        order,
        { ttl: Order_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres save fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.save.mockResolvedValue(fail);

      const result = await repo.save(order);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
    });

    it('should return failure if cache throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.save(order);

      expect(isFailure(result)).toBe(true);
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
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(order));

      const result = await repo.findById(order.id);

      expect(cacheService.set).toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(
        Result.failure(new RepositoryError('fail')),
      );

      const result = await repo.findById(order.id);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('deleteById', () => {
    it('should delete from postgres and cache', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(order.id);

      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Order_REDIS.CACHE_KEY}${order.id}`,
      );
      expect(isSuccess(result)).toBe(true);
    });
  });
});
