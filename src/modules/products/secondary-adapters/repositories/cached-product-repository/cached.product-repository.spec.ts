// src/modules/products/infrastructure/repositories/CachedProductRepository/cached.product-repository.spec.ts
import { PRODUCT_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { CachedProductRepository } from './cached.product-repository';
import { ProductTestFactory } from '../../../testing/factories/product.factory';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { CreateProductInputFactory } from '../../../testing/factories/create-product-input.factory';
import { UpdateProductInputFactory } from '../../../testing/factories/update-product-input.factory';
import { MockCacheService } from '../../../../../testing';
import { MockProductRepository } from '../../../testing/mocks/product-repository.mock';

describe('CachedProductRepository', () => {
  let repo: CachedProductRepository;
  let cacheService: MockCacheService;
  let postgresRepo: MockProductRepository;

  const mockProduct = ProductTestFactory.createMockProduct();
  const createDto = CreateProductInputFactory.createMockDto();
  const updateDto = UpdateProductInputFactory.createMockDto();

  beforeEach(() => {
    cacheService = new MockCacheService();
    postgresRepo = new MockProductRepository();

    repo = new CachedProductRepository(cacheService, postgresRepo);
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
        `${PRODUCT_REDIS.CACHE_KEY}:${mockProduct.id}`,
        mockProduct,
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should save expensive product', async () => {
      const expensiveDto =
        CreateProductInputFactory.createExpensiveProductDto();
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
      const productId = 1;

      postgresRepo.update.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockResolvedValue(undefined);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.update(productId, updateDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(postgresRepo.update).toHaveBeenCalledWith(productId, updateDto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${mockProduct.id}`,
        mockProduct,
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should update only price', async () => {
      const productId = 1;
      const priceOnlyDto = UpdateProductInputFactory.createPriceOnlyDto(200);
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
      const productId = 1;
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
      const productId = 1;

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
      const productId = 1;

      cacheService.get.mockResolvedValue(mockProduct);

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(cacheService.get).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${productId}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached and then cache it', async () => {
      const productId = 1;

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockProduct));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockProduct);
      expect(postgresRepo.findById).toHaveBeenCalledWith(productId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${productId}`,
        mockProduct,
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres findById fails', async () => {
      const productId = 1;
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
      const productId = 1;

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
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );
      expect(cacheService.getAll).toHaveBeenCalledWith(PRODUCT_REDIS.INDEX);
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
          key: `${PRODUCT_REDIS.CACHE_KEY}:${p.id}`,
          value: p,
        })),
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        PRODUCT_REDIS.IS_CACHED_FLAG,
        'true',
        { ttl: PRODUCT_REDIS.EXPIRATION },
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
      const productId = 1;

      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.deleteById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.deleteById).toHaveBeenCalledWith(productId);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${productId}`,
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres delete fails', async () => {
      const productId = 1;
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
      const productId = 1;

      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === `${PRODUCT_REDIS.CACHE_KEY}:${productId}`) {
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
      const productId = 1;

      postgresRepo.deleteById.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockImplementation((key: string) => {
        if (key === PRODUCT_REDIS.IS_CACHED_FLAG) {
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
