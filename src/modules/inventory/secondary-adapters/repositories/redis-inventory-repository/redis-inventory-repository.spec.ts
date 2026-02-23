// src/modules/inventory/infrastructure/repositories/redis-inventory-repository.spec.ts
import { CacheService } from '../../../../../shared-kernel/infrastructure/redis/cache/cache.service';
import { Inventory } from '../../../core/domain/entities/inventory';
import {
  InventoryCacheMapper,
  InventoryForCache,
} from '../../persistence/mappers/inventory.mapper';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { INVENTORY_REDIS } from '../../../../../shared-kernel/infrastructure/redis/constants/redis.constants';
import { InventoryBuilder } from '../../../testing/builders/inventory.test.builder';
import { MockInventoryRepository } from '../../../testing/mocks/inventory-repository.mock';
import { RedisInventoryRepository } from './redis-inventory-repository';
import { InventoryDtoTestFactory } from '../../../testing/factories/inventory-dto.test.factory';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';

describe('RedisInventoryRepository', () => {
  let repository: RedisInventoryRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: MockInventoryRepository;

  const inventoryId = 1;
  const productId = 1;
  const inventoryPrimitives = new InventoryBuilder()
    .withId(inventoryId)
    .withProductId(productId)
    .asInStock()
    .build();
  const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
  const cachedInventory: InventoryForCache =
    InventoryCacheMapper.toCache(domainInventory);

  const idKey = (id: number) => `${INVENTORY_REDIS.CACHE_KEY}:${id}`;
  const productKey = (pid: number) =>
    `${INVENTORY_REDIS.CACHE_KEY}:product:${pid}`;

  const defaultLowStockQueryDto =
    InventoryDtoTestFactory.createLowStockQueryDto();

  beforeEach(() => {
    // Mock CacheService methods
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      setAll: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    postgresRepo = new MockInventoryRepository();
    repository = new RedisInventoryRepository(cacheService, postgresRepo);
    jest.clearAllMocks();
  });

  // --- FindById Tests ---
  describe('findById', () => {
    it('should return inventory from cache on cache hit and not call postgres', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(cachedInventory);

      // Act
      const result = await repository.findById(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainInventory);
      expect(cacheService.get).toHaveBeenCalledWith(idKey(inventoryId));
      postgresRepo.verifyNoUnexpectedCalls();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should fetch from postgres, cache the result, and return inventory on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      postgresRepo.mockSuccessfulFindById(inventoryPrimitives);

      // Act
      const result = await repository.findById(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainInventory);
      postgresRepo.verifyFindByIdCalledWith(inventoryId);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(inventoryId),
        cachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        productKey(productId),
        cachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres lookup fails on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      const dbError = new RepositoryError('DB error');
      postgresRepo.findById.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.findById(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      postgresRepo.verifyFindByIdCalledWith(inventoryId);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return a RepositoryError if cacheService.get throws an error', async () => {
      // Arrange
      const error = new Error('Redis connection failed');
      cacheService.get.mockRejectedValue(error);

      // Act
      const result = await repository.findById(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find inventory',
        RepositoryError,
        error,
      );
      postgresRepo.verifyNoUnexpectedCalls();
    });

    it('should return a RepositoryError if cacheService.set throws an error after successful DB fetch', async () => {
      // Arrange
      postgresRepo.mockSuccessfulFindById(inventoryPrimitives);
      const error = new Error('Redis save failed');
      cacheService.set.mockRejectedValue(error);

      // Act
      const result = await repository.findById(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find inventory',
        RepositoryError,
        error,
      );
      postgresRepo.verifyFindByIdCalledWith(inventoryId);
    });
  });

  // --- FindByProductId Tests ---
  describe('findByProductId', () => {
    it('should return inventory from cache on cache hit and not call postgres', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(cachedInventory);

      // Act
      const result = await repository.findByProductId(productId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainInventory);
      expect(cacheService.get).toHaveBeenCalledWith(productKey(productId));
      postgresRepo.verifyNoUnexpectedCalls();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should fetch from postgres, cache the result, and return inventory on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      postgresRepo.mockSuccessfulFindByProductId(inventoryPrimitives);

      // Act
      const result = await repository.findByProductId(productId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainInventory);
      postgresRepo.verifyFindByProductIdCalledWith(productId);

      expect(cacheService.set).toHaveBeenCalledWith(
        productKey(productId),
        cachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(inventoryId),
        cachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres lookup fails on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      const dbError = new RepositoryError('DB error');
      postgresRepo.findByProductId.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.findByProductId(productId);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      postgresRepo.verifyFindByProductIdCalledWith(productId);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  // --- FindByProductIds Tests ---
  describe('findByProductIds', () => {
    const productIds = [1, 2, 3];
    const inv1 = new InventoryBuilder()
      .withProductId(productIds[0])
      .withId(101)
      .asInStock()
      .build();
    const inv2 = new InventoryBuilder()
      .withProductId(productIds[1])
      .withId(102)
      .asInStock()
      .build();
    const inv3 = new InventoryBuilder()
      .withProductId(productIds[2])
      .withId(103)
      .asInStock()
      .build();
    const domainInv1 = Inventory.fromPrimitives(inv1);
    const domainInv2 = Inventory.fromPrimitives(inv2);
    const domainInv3 = Inventory.fromPrimitives(inv3);
    const cachedInv1 = InventoryCacheMapper.toCache(domainInv1);
    const cachedInv2 = InventoryCacheMapper.toCache(domainInv2);
    const cachedInv3 = InventoryCacheMapper.toCache(domainInv3);

    it('should return an empty array for an empty input list', async () => {
      // Act
      const result = await repository.findByProductIds([]);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([]);
      expect(cacheService.get).not.toHaveBeenCalled();
      postgresRepo.verifyNoUnexpectedCalls();
    });

    it('should return all from cache when all are cache hits', async () => {
      // Arrange
      cacheService.get.mockImplementation((key: string) => {
        if (key === productKey(productIds[0]))
          return Promise.resolve(cachedInv1);
        if (key === productKey(productIds[1]))
          return Promise.resolve(cachedInv2);
        if (key === productKey(productIds[2]))
          return Promise.resolve(cachedInv3);
        return Promise.resolve(null);
      });

      // Act
      const result = await repository.findByProductIds(productIds);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([domainInv1, domainInv2, domainInv3]);
      expect(cacheService.get).toHaveBeenCalledTimes(3);
      postgresRepo.verifyNoUnexpectedCalls();
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });

    it('should fetch misses from postgres, cache them, and combine results', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === productKey(productIds[0]))
          return Promise.resolve(cachedInv1);
        return Promise.resolve(null);
      });
      postgresRepo.findByProductIds.mockResolvedValue(
        Result.success([domainInv2, domainInv3]),
      );

      // Act
      const result = await repository.findByProductIds(productIds);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([domainInv1, domainInv2, domainInv3]);
      expect(cacheService.get).toHaveBeenCalledTimes(3);
      expect(postgresRepo.findByProductIds).toHaveBeenCalledWith([
        productIds[1],
        productIds[2],
      ]);

      const expectedEntries = [
        { key: productKey(productIds[1]), value: cachedInv2 },
        { key: idKey(inv2.id!), value: cachedInv2 },
        { key: productKey(productIds[2]), value: cachedInv3 },
        { key: idKey(inv3.id!), value: cachedInv3 },
      ];
      expect(cacheService.setAll).toHaveBeenCalledWith(expectedEntries, {
        ttl: INVENTORY_REDIS.EXPIRATION,
        nx: true,
      });
    });

    it('should return failure if postgres lookup fails for misses', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === productKey(productIds[0]))
          return Promise.resolve(cachedInv1);
        return Promise.resolve(null);
      });
      const dbError = new RepositoryError('Bulk DB error');
      postgresRepo.findByProductIds.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.findByProductIds(productIds);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.findByProductIds).toHaveBeenCalledWith([
        productIds[1],
        productIds[2],
      ]);
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });

    it('should handle a scenario where postgres returns no inventories for misses', async () => {
      cacheService.get.mockImplementation((key: string) => {
        if (key === productKey(productIds[0]))
          return Promise.resolve(cachedInv1);
        return Promise.resolve(null);
      });
      postgresRepo.mockEmptyFindByProductIds();

      // Act
      const result = await repository.findByProductIds(productIds);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([domainInv1]);
      expect(postgresRepo.findByProductIds).toHaveBeenCalledWith([
        productIds[1],
        productIds[2],
      ]);
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });

    it('should return a RepositoryError if cacheService.get throws an error', async () => {
      // Arrange
      const error = new Error('Redis connection failed');
      cacheService.get.mockRejectedValue(error);

      // Act
      const result = await repository.findByProductIds(productIds);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find inventories by product IDs',
        RepositoryError,
        error,
      );
      postgresRepo.verifyNoUnexpectedCalls();
    });
  });

  // --- FindLowStock Tests ---
  describe('findLowStock', () => {
    it('should fetch from postgres, cache results, and return low stock inventories', async () => {
      // Arrange

      const lowStockInv = InventoryTestFactory.createLowStockInventory({
        id: 1,
      });
      const domainLowStock = Inventory.fromPrimitives(lowStockInv);
      const cachedLowStock = InventoryCacheMapper.toCache(domainLowStock);

      postgresRepo.mockSuccessfulFindLowStock([lowStockInv]);

      // Act
      const result = await repository.findLowStock(defaultLowStockQueryDto);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([domainLowStock]);

      expect(postgresRepo.findLowStock).toHaveBeenCalledWith(
        defaultLowStockQueryDto,
      );

      const expectedEntries = [
        { key: productKey(lowStockInv.productId), value: cachedLowStock },
        { key: idKey(lowStockInv.id!), value: cachedLowStock },
      ];
      expect(cacheService.setAll).toHaveBeenCalledWith(expectedEntries, {
        ttl: INVENTORY_REDIS.EXPIRATION,
        nx: true,
      });
    });

    it('should return failure if postgres lookup fails', async () => {
      // Arrange
      const dbError = new RepositoryError('DB error');
      postgresRepo.findLowStock.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.findLowStock(defaultLowStockQueryDto);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.findLowStock).toHaveBeenCalled();
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });

    it('should not call cache.setAll if postgres returns an empty array', async () => {
      // Arrange
      postgresRepo.mockEmptyLowStock();

      // Act
      const result = await repository.findLowStock(defaultLowStockQueryDto);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([]);
      expect(postgresRepo.findLowStock).toHaveBeenCalled();
      expect(cacheService.setAll).not.toHaveBeenCalled();
    });
  });

  // --- Save Tests ---
  describe('save', () => {
    it('should save to postgres, cache the result, and delete the cached flag', async () => {
      // Arrange
      const newInventory = new InventoryBuilder()
        .withId(999)
        .withProductId(888)
        .asZeroInventory()
        .build();
      const newDomainInventory = Inventory.fromPrimitives(newInventory);
      const newCachedInventory =
        InventoryCacheMapper.toCache(newDomainInventory);

      postgresRepo.mockSuccessfulSave(newDomainInventory);

      // Act
      const result = await repository.save(newDomainInventory);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(newDomainInventory);
      expect(postgresRepo.save).toHaveBeenCalledWith(newDomainInventory);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(newInventory.id!),
        newCachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        productKey(newInventory.productId),
        newCachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        INVENTORY_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres save fails', async () => {
      // Arrange
      const dbError = new RepositoryError('Save failed');
      postgresRepo.save.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.save(domainInventory);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.save).toHaveBeenCalledWith(domainInventory);
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  // --- Update Tests ---
  describe('update', () => {
    it('should update in postgres, cache the new result, and delete the cached flag', async () => {
      // Arrange
      const updatedInventory = domainInventory;
      const updatedCachedInventory =
        InventoryCacheMapper.toCache(updatedInventory);

      postgresRepo.mockSuccessfulUpdate(updatedInventory);

      // Act
      const result = await repository.update(updatedInventory);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(updatedInventory);
      expect(postgresRepo.update).toHaveBeenCalledWith(updatedInventory);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(updatedInventory.id!),
        updatedCachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        productKey(updatedInventory.productId),
        updatedCachedInventory,
        { ttl: INVENTORY_REDIS.EXPIRATION },
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        INVENTORY_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should return failure if postgres update fails', async () => {
      // Arrange
      const dbError = new RepositoryError('Update failed');
      postgresRepo.update.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.update(domainInventory);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.update).toHaveBeenCalledWith(domainInventory);
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  // --- Delete Tests ---
  describe('delete', () => {
    it('should delete from postgres, delete the ID key, and delete the cached flag', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(cachedInventory);
      postgresRepo.mockSuccessfulDelete();

      // Act
      const result = await repository.delete(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);

      expect(cacheService.get).toHaveBeenCalledWith(idKey(inventoryId));

      expect(cacheService.delete).toHaveBeenCalledWith(productKey(productId));

      postgresRepo.verifyDeleteCalledWith(inventoryId);

      expect(cacheService.delete).toHaveBeenCalledWith(idKey(inventoryId));

      expect(cacheService.delete).toHaveBeenCalledWith(
        INVENTORY_REDIS.IS_CACHED_FLAG,
      );
    });

    it('should skip deleting product key if cache miss on initial check', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      postgresRepo.mockSuccessfulDelete();

      // Act
      const result = await repository.delete(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.get).toHaveBeenCalledWith(idKey(inventoryId));
      expect(cacheService.delete).toHaveBeenCalledTimes(2);
      expect(cacheService.delete).not.toHaveBeenCalledWith(
        productKey(productId),
      );
      postgresRepo.verifyDeleteCalledWith(inventoryId);
    });

    it('should return failure if postgres delete fails', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(cachedInventory);
      const dbError = new RepositoryError('Delete failed');
      postgresRepo.delete.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.delete(inventoryId);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(cacheService.delete).toHaveBeenCalledWith(productKey(productId));
      postgresRepo.verifyDeleteCalledWith(inventoryId);
      expect(cacheService.delete).toHaveBeenCalledTimes(1);
      expect(cacheService.delete).not.toHaveBeenCalledWith(idKey(inventoryId));
      expect(cacheService.delete).not.toHaveBeenCalledWith(
        INVENTORY_REDIS.IS_CACHED_FLAG,
      );
    });
  });
});
