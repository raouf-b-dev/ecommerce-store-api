// src/modules/products/infrastructure/repositories/RedisProductRepository/redis.product-repository.spec.ts
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Product_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { IProduct } from '../../../domain/interfaces/IProduct';
import { RedisProductRepository } from './redis.product-repository';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

describe('RedisProductRepository', () => {
  let repo: RedisProductRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<ProductRepository>;
  let product: IProduct;
  let createProductDto: CreateProductDto;
  let updateProductDto: UpdateProductDto;
  let id: string;
  let products: IProduct[];

  beforeEach(() => {
    cacheService = {
      ttl: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      set: jest.fn(),
      setAll: jest.fn(),
      merge: jest.fn(),
      mergeAll: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
      exists: jest.fn(),
      search: jest.fn(),
      scanKeys: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    postgresRepo = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };

    repo = new RedisProductRepository(cacheService, postgresRepo);

    id = 'PR0000001';
    createProductDto = {
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
    };

    updateProductDto = {
      name: 'updated car',
      description: 'An even faster car',
      price: 37000,
      sku: 'CAR-002',
      stockQuantity: 12,
    };

    product = {
      id,
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    };

    products = [
      product,
      {
        ...product,
        id: 'PR0000002',
        name: 'bike',
        sku: 'BIKE-001',
      },
    ];
  });

  // save
  describe('save', () => {
    it('should save to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.save(createProductDto);

      expect(postgresRepo.save).toHaveBeenCalledWith(createProductDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) expect(result.value).toEqual(product);
    });

    it('should return failure if postgres save fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.save.mockResolvedValue(fail);

      const result = await repo.save(createProductDto);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) expect(result.error.message).toBe('fail');
    });

    it('should return failure if cache.set throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(product));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.save(createProductDto);

      expect(postgresRepo.save).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to save product');
      }
    });

    it('should return failure if cache.delete (IS_CACHED_FLAG) throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('flag delete error'));

      const result = await repo.save(createProductDto);

      expect(cacheService.set).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to save product');
      }
    });
  });

  // update
  describe('update', () => {
    it('should update to postgres and cache', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.update(id, updateProductDto);

      expect(postgresRepo.update).toHaveBeenCalledWith(id, updateProductDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) expect(result.value).toEqual(product);
    });

    it('should return failure if postgres update fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.update.mockResolvedValue(fail);

      const result = await repo.update(id, updateProductDto);

      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) expect(result.error.message).toBe('fail');
    });

    it('should return failure if cache.set throws during update', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(product));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.update(id, updateProductDto);

      expect(postgresRepo.update).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to update product');
      }
    });

    it('should return failure if cache.delete (IS_CACHED_FLAG) throws during update', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('flag delete error'));

      const result = await repo.update(id, updateProductDto);

      expect(cacheService.set).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to update product');
      }
    });
  });

  // findById
  describe('findById', () => {
    it('should return cached product if found', async () => {
      cacheService.get.mockResolvedValue(product);

      const result = await repo.findById(id);

      expect(cacheService.get).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${id}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) expect(result.value).toEqual(product);
    });

    it('should fetch from postgres if not cached and then cache it', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(product));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findById(id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(id);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) expect(result.value).toEqual(product);
    });

    it('should return failure if postgres findById fails', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(
        Result.failure(new RepositoryError('fail')),
      );

      const result = await repo.findById(id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(id);
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) expect(result.error.message).toBe('fail');
    });

    it('should return failure if cache.set throws after postgres success', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(product));
      cacheService.set.mockRejectedValue(new Error('cache error'));

      const result = await repo.findById(id);

      expect(postgresRepo.findById).toHaveBeenCalledWith(id);
      expect(cacheService.set).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find product');
      }
    });
  });

  // findAll
  describe('findAll', () => {
    it('should return cached products if IS_CACHED_FLAG is true', async () => {
      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue(products);

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(cacheService.getAll).toHaveBeenCalledWith(Product_REDIS.INDEX);
      expect(postgresRepo.findAll).not.toHaveBeenCalled();
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) expect(result.value).toEqual(products);
    });

    it('should fetch from postgres and cache if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findAll();

      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(postgresRepo.findAll).toHaveBeenCalled();
      // Check setAll call shape
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
      if (isSuccess(result)) expect(result.value).toEqual(products);
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
      expect(cacheService.setAll).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
        expect.any(String),
        expect.any(Object),
      );
      expect(isFailure(result)).toBe(true);
      if (isFailure(result))
        expect(result.error.message).toBe('Postgres find all failed');
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
      expect(cacheService.setAll).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
        expect.any(String),
        expect.any(Object),
      );
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find all products');
      }
    });

    it('should return failure if cache.set (flag) throws after setAll success', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockRejectedValue(new Error('Cache flag set failed'));

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
      );
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to find all products');
      }
    });
  });

  // deleteById
  describe('deleteById', () => {
    it('should delete from postgres and cache and clear list flag', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(id);

      expect(postgresRepo.deleteById).toHaveBeenCalledWith(id);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${id}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(isSuccess(result)).toBe(true);
    });

    it('should return failure if postgres delete fails', async () => {
      const fail = Result.failure<RepositoryError>(new RepositoryError('fail'));
      postgresRepo.deleteById.mockResolvedValue(fail);

      const result = await repo.deleteById(id);

      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) expect(result.error.message).toBe('fail');
    });

    it('should return failure if cache.delete for individual product throws', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === `${Product_REDIS.CACHE_KEY}:${id}`) {
          return Promise.reject(new Error('cache delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(id);

      expect(postgresRepo.deleteById).toHaveBeenCalledWith(id);
      expect(cacheService.delete).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to delete product');
      }
    });

    it('should return failure if cache.delete for IS_CACHED_FLAG throws', async () => {
      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === Product_REDIS.IS_CACHED_FLAG) {
          return Promise.reject(new Error('flag delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(id);

      expect(postgresRepo.deleteById).toHaveBeenCalledWith(id);
      expect(cacheService.delete).toHaveBeenCalled();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Failed to delete product');
      }
    });
  });
});
