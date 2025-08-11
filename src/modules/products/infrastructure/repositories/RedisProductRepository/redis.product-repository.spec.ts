// src/Product/infrastructure/redis-Product.repository.spec.ts
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Product_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Product } from '../../../domain/entities/product';
import { RedisProductRepository } from './redis.product-repository';

describe('RedisProductRepository', () => {
  let repo: RedisProductRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<ProductRepository>;
  let product: Product;

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

    repo = new RedisProductRepository(cacheService, postgresRepo);

    product = { id: 1, name: 'Test Product' } as unknown as Product;
  });

  describe('save', () => {
    it('should save to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.save(product);

      expect(postgresRepo.save).toHaveBeenCalledWith(product);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres save fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.save.mockResolvedValue(fail);

      const result = await repo.save(product);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
    });

    it('should return failure if cache throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(undefined));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.save(product);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return cached Product if found', async () => {
      cacheService.get.mockResolvedValue(product);

      const result = await repo.findById(product.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(product);
      }
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(product));

      const result = await repo.findById(product.id);

      expect(cacheService.set).toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(
        Result.failure(new RepositoryError('fail')),
      );

      const result = await repo.findById(product.id);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('deleteById', () => {
    it('should delete from postgres and cache', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(product.id);

      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}${product.id}`,
      );
      expect(isSuccess(result)).toBe(true);
    });
  });
});
