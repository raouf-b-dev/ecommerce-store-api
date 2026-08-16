// src/modules/products/infrastructure/repositories/CachedProductRepository/cached.product-repository.spec.ts
import {
  ProductTestFactory,
  MockProductRepository,
} from 'src/modules/products/testing';
import { PRODUCT_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { CachedProductRepository } from './cached.product-repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { MockCacheService } from '../../../../../testing';
import { Product } from '../../../core/domain/entities/product';

describe('CachedProductRepository', () => {
  let repo: CachedProductRepository;
  let cacheService: MockCacheService;
  let postgresRepo: MockProductRepository;

  const mockProduct = ProductTestFactory.createMockProduct();
  const domainProduct = Product.fromPrimitives(mockProduct);

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
      postgresRepo.save.mockResolvedValue(Result.success(domainProduct));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.save(domainProduct);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.save).toHaveBeenCalledWith(domainProduct, undefined);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${domainProduct.id}`,
        domainProduct.toPrimitives(),
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should save expensive product', async () => {
      const expensiveProduct = Product.fromPrimitives(
        ProductTestFactory.createExpensiveProduct(),
      );

      postgresRepo.save.mockResolvedValue(Result.success(expensiveProduct));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repo.save(expensiveProduct);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure if postgres save fails', async () => {
      const error = new RepositoryError('Postgres save failed');

      postgresRepo.save.mockResolvedValue(Result.failure(error));

      const result = await repo.save(domainProduct);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Postgres save failed',
        RepositoryError,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should return failure if cache.set throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(domainProduct));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await repo.save(domainProduct);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        RepositoryError,
      );
    });

    it('should return failure if cache.delete (IS_CACHED_FLAG) throws', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(domainProduct));
      cacheService.set.mockResolvedValue(true);
      cacheService.delete.mockRejectedValue(new Error('Flag delete error'));

      const result = await repo.save(domainProduct);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
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
      expect(result.value.toPrimitives()).toEqual(domainProduct.toPrimitives());
      expect(cacheService.get).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${productId}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres if not cached and then cache it', async () => {
      const productId = 1;

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(domainProduct));
      cacheService.set.mockResolvedValue(true);

      const result = await repo.findById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainProduct);
      expect(postgresRepo.findById).toHaveBeenCalledWith(productId);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${PRODUCT_REDIS.CACHE_KEY}:${productId}`,
        domainProduct.toPrimitives(),
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
      postgresRepo.findById.mockResolvedValue(Result.success(domainProduct));
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
      expect(result.value).toHaveLength(3);
      expect(cacheService.get).toHaveBeenCalledWith(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );
      expect(cacheService.getAll).toHaveBeenCalledWith(PRODUCT_REDIS.INDEX);
      expect(postgresRepo.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache if not cached', async () => {
      const mockList = ProductTestFactory.createProductList(2);
      const domainProducts = mockList.map((p) => Product.fromPrimitives(p));

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(domainProducts));
      cacheService.setAll.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(true);

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainProducts);
      expect(postgresRepo.findAll).toHaveBeenCalled();
      expect(cacheService.setAll).toHaveBeenCalledWith(
        domainProducts.map((p) => ({
          key: `${PRODUCT_REDIS.CACHE_KEY}:${p.id}`,
          value: p.toPrimitives(),
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
      const mockList = ProductTestFactory.createProductList(2);
      const domainProducts = mockList.map((p) => Product.fromPrimitives(p));

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(domainProducts));
      cacheService.setAll.mockRejectedValue(new Error('Cache setAll failed'));

      const result = await repo.findAll();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find all products',
        RepositoryError,
      );
    });

    it('should return failure if cache.set (flag) throws after setAll success', async () => {
      const mockList = ProductTestFactory.createProductList(2);
      const domainProducts = mockList.map((p) => Product.fromPrimitives(p));

      cacheService.get.mockResolvedValue(null);
      postgresRepo.findAll.mockResolvedValue(Result.success(domainProducts));
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

  describe('findByIds', () => {
    it('should return empty array if no ids provided', async () => {
      const result = await repo.findByIds([]);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([]);
    });

    it('should return products from cache if all present using getMany', async () => {
      cacheService.getMany.mockResolvedValue([mockProduct]);

      const result = await repo.findByIds([domainProduct.id!]);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.length).toBe(1);
      expect(cacheService.getMany).toHaveBeenCalledWith([
        `${PRODUCT_REDIS.CACHE_KEY}:${domainProduct.id}`,
      ]);
      expect(postgresRepo.findByIds).not.toHaveBeenCalled();
    });

    it('should fallback to postgres for missing ids and cache them', async () => {
      cacheService.getMany.mockResolvedValue([null]);
      postgresRepo.findByIds.mockResolvedValue(Result.success([domainProduct]));
      cacheService.setAll.mockResolvedValue(undefined);

      const result = await repo.findByIds([domainProduct.id!]);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.findByIds).toHaveBeenCalledWith([domainProduct.id!]);
      expect(cacheService.setAll).toHaveBeenCalled();
    });
  });
});
