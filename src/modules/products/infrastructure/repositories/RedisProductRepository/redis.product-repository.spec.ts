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
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

describe('RedisProductRepository', () => {
  let repo: RedisProductRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<ProductRepository>;
  let product: Product;
  let createProductDto: CreateProductDto;
  let updateProductDto: UpdateProductDto;
  let id: number;
  let products: Product[]; // Added for findAll tests

  beforeEach(() => {
    cacheService = {
      set: jest.fn(),
      setAll: jest.fn(), // Mock setAll
      get: jest.fn(),
      getAll: jest.fn(), // Mock getAll
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

    createProductDto = {
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
    } as CreateProductDto;

    id = 1;
    updateProductDto = {
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
    } as UpdateProductDto;

    product = {
      id,
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    } as Product;

    products = [
      // Sample products for findAll
      product,
      {
        ...product,
        id: 2,
        name: 'bike',
        sku: 'BIKE-001',
      },
    ];
  });

  describe('save', () => {
    it('should save to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined); // Mock delete for IS_CACHED_FLAG

      const result = await repo.save(createProductDto);

      expect(postgresRepo.save).toHaveBeenCalledWith(createProductDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      ); // Expect IS_CACHED_FLAG to be cleared
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(product);
      }
    });

    it('should return failure if postgres save fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.save.mockResolvedValue(fail);

      const result = await repo.save(createProductDto);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled(); // Flag not cleared if save fails
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if cache throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(product));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.save(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        // Corrected error message expectation
        expect(result.error.message).toContain('Failed to save product');
      }
    });

    it('should return failure if IS_CACHED_FLAG deletion throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('flag delete error'));

      const result = await repo.save(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to save product');
      }
    });
  });

  describe('update', () => {
    it('should update to postgres and cache', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined); // Mock delete for IS_CACHED_FLAG

      const result = await repo.update(id, updateProductDto);

      expect(postgresRepo.update).toHaveBeenCalledWith(id, updateProductDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      ); // Expect IS_CACHED_FLAG to be cleared
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(product);
      }
    });

    it('should return failure if postgres update fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.update.mockResolvedValue(fail);

      const result = await repo.update(id, updateProductDto);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled(); // Flag not cleared if update fails
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if cache throws', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(product));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.update(id, updateProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        // Corrected error message expectation
        expect(result.error.message).toContain('Failed to update product');
      }
    });

    it('should return failure if IS_CACHED_FLAG deletion throws', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('flag delete error'));

      const result = await repo.update(id, updateProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to update product');
      }
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
      expect(cacheService.get).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
      ); // Check cache key
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined); // Ensure set is mocked

      const result = await repo.findById(product.id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(product.id);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`, // Corrected key
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(product);
      }
    });

    it('should return failure if postgres fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(
        Result.failure(new RepositoryError('fail')),
      );

      const result = await repo.findById(product.id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(product.id);
      expect(cacheService.set).not.toHaveBeenCalled(); // No caching if postgres fails
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if caching fails after fetching from postgres', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(product));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.findById(product.id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(product.id);
      expect(cacheService.set).toHaveBeenCalled(); // Set was attempted
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        // Corrected error message expectation
        expect(result.error.message).toContain('Failed to find product');
      }
    });
  });

  describe('findAll', () => {
    it('should return cached Products if IS_CACHED_FLAG is true', async () => {
      cacheService.get.mockResolvedValue('true'); // Simulate flag being set
      cacheService.getAll.mockResolvedValue(products);

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(cacheService.getAll).toHaveBeenCalledWith(Product_REDIS.INDEX);
      expect(postgresRepo.findAll).not.toHaveBeenCalled(); // PostgreSQL should not be called
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(products);
      }
    });

    it('should fetch from postgres, cache products and flag if IS_CACHED_FLAG is null', async () => {
      cacheService.get.mockResolvedValue(null); // Simulate flag not set
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockResolvedValue(undefined); // Mock setAll success
      cacheService.set.mockResolvedValue(undefined); // Mock set success for the flag

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(postgresRepo.findAll).toHaveBeenCalled(); // PostgreSQL should be called
      expect(cacheService.setAll).toHaveBeenCalledWith(
        products.map((p) => ({
          key: `${Product_REDIS.CACHE_KEY}:${p.id}`,
          value: p,
        })),
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(products);
      }
    });

    it('should return failure if postgres findAll fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(
        Result.failure(new RepositoryError('Postgres find all failed')),
      );

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).not.toHaveBeenCalled(); // No caching if postgres fails
      expect(cacheService.set).not.toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
        expect.any(String),
        expect.any(Object),
      ); // Flag not set
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Postgres find all failed');
      }
    });

    it('should return failure if cache.setAll throws after postgres success', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockRejectedValue(new Error('Cache setAll failed'));

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalled(); // setAll was called
      expect(cacheService.set).not.toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
        expect.any(String),
        expect.any(Object),
      ); // Flag not set if setAll fails
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find all products'); // Generic error from ErrorFactory
      }
    });

    it('should return failure if cache.set (for flag) throws after postgres success and setAll success', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockRejectedValue(new Error('Cache flag set failed')); // Flag set fails

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: Product_REDIS.EXPIRATION },
      ); // Flag set was called
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find all products');
      }
    });
  });

  describe('deleteById', () => {
    it('should delete from postgres and cache, and clear the list flag', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      // Mock both individual product delete and IS_CACHED_FLAG delete
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(product.id);

      expect(postgresRepo.deleteById).toHaveBeenCalledWith(product.id);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
      ); // Individual product cache key
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      ); // List flag should be cleared
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres delete fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.deleteById.mockResolvedValue(fail);

      const result = await repo.deleteById(product.id);

      expect(cacheService.delete).not.toHaveBeenCalled(); // Cache delete not called
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('fail');
      }
    });

    it('should return failure if cache throws during individual product deletion', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === `${Product_REDIS.CACHE_KEY}:${product.id}`) {
          return Promise.reject(new Error('cache delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(product.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        // Corrected error message expectation
        expect(result.error.message).toContain('Failed to delete product');
      }
    });

    it('should return failure if cache throws during IS_CACHED_FLAG deletion', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === Product_REDIS.IS_CACHED_FLAG) {
          return Promise.reject(new Error('flag delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(product.id);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        // Corrected error message expectation
        expect(result.error.message).toContain('Failed to delete product');
      }
    });
  });
});
