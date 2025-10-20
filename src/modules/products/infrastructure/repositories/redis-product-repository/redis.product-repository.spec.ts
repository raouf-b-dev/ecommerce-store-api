// src/modules/products/infrastructure/repositories/RedisProductRepository/redis.product-repository.spec.ts
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { Product_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { RedisProductRepository } from './redis.product-repository';
import { ProductTestFactory } from '../../../testing/factories/product.factory';
import { CreateProductDtoFactory } from '../../../testing/factories/create-product-dto.factory';
import { UpdateProductDtoFactory } from '../../../testing/factories/update-product-dto.factory';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('RedisProductRepository', () => {
  let repo: RedisProductRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<ProductRepository>;

  const mockProduct = ProductTestFactory.createMockProduct();
  const createDto = CreateProductDtoFactory.createMockDto();
  const updateDto = UpdateProductDtoFactory.createMockDto();

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.save(createDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(postgresRepo.save).toHaveBeenCalledWith(createDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${mockProduct.id}`,
        mockProduct,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should save expensive product', async () => {
      const expensiveDto = CreateProductDtoFactory.createExpensiveProductDto();
      const expensiveProduct = ProductTestFactory.createExpensiveProduct();

      postgresRepo.save.mockResolvedValue(Result.success(expensiveProduct));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.save(expensiveDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(35000);
    });

    it('should return failure if postgres save fails', async () => {
      const error = new RepositoryError('Postgres save failed');

      postgresRepo.save.mockResolvedValue(Result.failure(error));

      const result = await repo.save(createDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Postgres save failed',
        RepositoryError,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should return failure if cache.set throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repo.save(createDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        RepositoryError,
      );
    });

    it('should return failure if cache.delete (IS_CACHED_FLAG) throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockRejectedValue(new Error('Flag delete error'));

      const result = await repo.save(createDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        RepositoryError,
      );
    });
  });

  describe('update', () => {
    it('should update to postgres and cache', async () => {
      const productId = 'PR0000001';

      postgresRepo.update.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.update(productId, updateDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(postgresRepo.update).toHaveBeenCalledWith(productId, updateDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${mockProduct.id}`,
        mockProduct,
        { ttl: Product_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should update only price', async () => {
      const productId = 'PR0000001';
      const priceOnlyDto = UpdateProductDtoFactory.createPriceOnlyDto(200);
      const updatedProduct = ProductTestFactory.createMockProduct({
        id: productId,
        price: 200,
      });

      postgresRepo.update.mockResolvedValue(Result.success(updatedProduct));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.update(productId, priceOnlyDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(200);
    });

    it('should return failure if postgres update fails', async () => {
      const productId = 'PR0000001';
      const error = new RepositoryError('Update failed');

      postgresRepo.update.mockResolvedValue(Result.failure(error));

      const result = await repo.update(productId, updateDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Update failed',
        RepositoryError,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return failure if cache.set throws during update', async () => {
      const productId = 'PR0000001';

      postgresRepo.update.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repo.update(productId, updateDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update product',
        RepositoryError,
      );
    });
  });

  describe('findById', () => {
    it('should return cached product if found', async () => {
      const productId = 'PR0000001';

      cacheService.get.mockResolvedValue(mockProduct);

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(cacheService.get).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${productId}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached and then cache it', async () => {
      const productId = 'PR0000001';

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(postgresRepo.findById).toHaveBeenCalledWith(productId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${productId}`,
        mockProduct,
        { ttl: Product_REDIS.EXPIRATION },
      );
    });

    it('should find low stock product from cache', async () => {
      const lowStockProduct = ProductTestFactory.createLowStockProduct();

      cacheService.get.mockResolvedValue(lowStockProduct);

      const result = await repo.findById(lowStockProduct.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.stockQuantity).toBe(3);
    });

    it('should return failure if postgres findById fails', async () => {
      const productId = 'PR0000001';
      const error = new RepositoryError('Not found');

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.failure(error));

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Not found',
        RepositoryError,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return failure if cache.set throws after postgres success', async () => {
      const productId = 'PR0000001';

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find product',
        RepositoryError,
      );
    });
  });

  describe('findAll', () => {
    it('should return cached products if IS_CACHED_FLAG is true', async () => {
      const products = ProductTestFactory.createProductList(3);

      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue(products);

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(products);
      expect(cacheService.get).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
      expect(cacheService.getAll).toHaveBeenCalledWith(Product_REDIS.INDEX);
      expect(postgresRepo.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache if not cached', async () => {
      const products = ProductTestFactory.createProductList(2);

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(products);
      expect(postgresRepo.findAll).toHaveBeenCalled();
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
    });

    it('should return products with different stock levels', async () => {
      const products = [
        ProductTestFactory.createInStockProduct(),
        ProductTestFactory.createLowStockProduct(),
        ProductTestFactory.createOutOfStockProduct(),
      ];

      cacheService.get.mockResolvedValue('true');
      cacheService.getAll.mockResolvedValue(products);

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(3);
    });

    it('should return failure if postgres findAll fails', async () => {
      const error = new RepositoryError('Postgres find all failed');

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.failure(error));

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Postgres find all failed',
        RepositoryError,
      );
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });

    it('should return failure if cache.setAll throws after postgres success', async () => {
      const products = ProductTestFactory.createProductList(2);

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockRejectedValue(new Error('Cache setAll failed'));

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find all products',
        RepositoryError,
      );
    });

    it('should return failure if cache.set (flag) throws after setAll success', async () => {
      const products = ProductTestFactory.createProductList(2);

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(products));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockRejectedValue(new Error('Cache flag set failed'));

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find all products',
        RepositoryError,
      );
    });
  });

  describe('deleteById', () => {
    it('should delete from postgres and cache and clear list flag', async () => {
      const productId = 'PR0000001';

      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.deleteById).toHaveBeenCalledWith(productId);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${Product_REDIS.CACHE_KEY}:${productId}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        Product_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres delete fails', async () => {
      const productId = 'PR0000001';
      const error = new RepositoryError('Delete failed');

      postgresRepo.deleteById.mockResolvedValue(Result.failure(error));

      const result = await repo.deleteById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Delete failed',
        RepositoryError,
      );
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should return failure if cache.delete for individual product throws', async () => {
      const productId = 'PR0000001';

      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === `${Product_REDIS.CACHE_KEY}:${productId}`) {
          return Promise.reject(new Error('Cache delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete product',
        RepositoryError,
      );
    });

    it('should return failure if cache.delete for IS_CACHED_FLAG throws', async () => {
      const productId = 'PR0000001';

      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === Product_REDIS.IS_CACHED_FLAG) {
          return Promise.reject(new Error('Flag delete error'));
        }
        return Promise.resolve();
      });

      const result = await repo.deleteById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete product',
        RepositoryError,
      );
    });
  });
});
