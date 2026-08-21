import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../../../core/domain/repositories/inventory.repository';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { INVENTORY_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import {
  InventoryForCache,
  InventoryCacheMapper,
} from '../../persistence/mappers/inventory.mapper';
import { Inventory } from '../../../core/domain/entities/inventory';
import {
  LowStockQuery,
  InventorySearchQuery,
  InventoryBatchQuery,
} from '../../../core/domain/repositories/inventory.repository';

@Injectable()
export class CachedInventoryRepository implements InventoryRepository {
  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: InventoryRepository,
  ) {}

  private idKey(id: number) {
    return `${INVENTORY_REDIS.CACHE_KEY}:${id}`;
  }

  private productKey(productId: number) {
    return `${INVENTORY_REDIS.CACHE_KEY}:product:${productId}`;
  }

  async findById(id: number): Promise<Result<Inventory, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<InventoryForCache>(
        this.idKey(id),
      );

      if (cached) {
        return Result.success<Inventory>(
          InventoryCacheMapper.fromCache(cached),
        );
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      const inventory = dbResult.value;

      if (inventory.id) {
        await this.cacheService.set(
          this.idKey(inventory.id),
          InventoryCacheMapper.toCache(inventory),
          {
            ttl: INVENTORY_REDIS.EXPIRATION,
          },
        );
      }

      await this.cacheService.set(
        this.productKey(inventory.productId),
        InventoryCacheMapper.toCache(inventory),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find inventory', error);
    }
  }

  async findByProductId(
    productId: number,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<InventoryForCache>(
        this.productKey(productId),
      );

      if (cached) {
        return Result.success<Inventory>(
          InventoryCacheMapper.fromCache(cached),
        );
      }

      const dbResult = await this.postgresRepo.findByProductId(productId);
      if (dbResult.isFailure) return dbResult;

      const inventory = dbResult.value;

      await this.cacheService.set(
        this.productKey(inventory.productId),
        InventoryCacheMapper.toCache(inventory),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      if (inventory.id) {
        await this.cacheService.set(
          this.idKey(inventory.id),
          InventoryCacheMapper.toCache(inventory),
          {
            ttl: INVENTORY_REDIS.EXPIRATION,
          },
        );
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventory by product ID',
        error,
      );
    }
  }

  async findByProductIds(
    productIds: number[],
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      if (productIds.length === 0) return Result.success<Inventory[]>([]);

      const foundMap = new Map<number, Inventory>();
      const misses: number[] = [];

      await Promise.all(
        productIds.map(async (productId) => {
          const cached = await this.cacheService.get<InventoryForCache>(
            this.productKey(productId),
          );

          if (cached) {
            foundMap.set(productId, InventoryCacheMapper.fromCache(cached));
          } else {
            misses.push(productId);
          }
        }),
      );

      if (misses.length > 0) {
        const dbResult = await this.postgresRepo.findByProductIds(misses);
        if (dbResult.isFailure) return dbResult;

        const dbInventories = dbResult.value;
        const entries = dbInventories.flatMap((inv) => {
          const items = [
            {
              key: this.productKey(inv.productId),
              value: InventoryCacheMapper.toCache(inv),
            },
          ];
          if (inv.id) {
            items.push({
              key: this.idKey(inv.id),
              value: InventoryCacheMapper.toCache(inv),
            });
          }
          return items;
        });

        if (entries.length > 0) {
          await this.cacheService.setAll(entries, {
            ttl: INVENTORY_REDIS.EXPIRATION,
            nx: true,
          });
        }

        dbInventories.forEach((inv) => foundMap.set(inv.productId, inv));
      }

      const resultArray = productIds
        .map((pid) => foundMap.get(pid))
        .filter((x): x is Inventory => !!x);

      return Result.success<Inventory[]>(resultArray);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventories by product IDs',
        error,
      );
    }
  }

  async findLowStock(
    query: LowStockQuery,
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.findLowStock(query);
      if (dbResult.isFailure) return dbResult;

      const inventories = dbResult.value;

      if (inventories.length > 0) {
        const entries = inventories.flatMap((inv) => {
          const items = [
            {
              key: this.productKey(inv.productId),
              value: InventoryCacheMapper.toCache(inv),
            },
          ];
          if (inv.id) {
            items.push({
              key: this.idKey(inv.id),
              value: InventoryCacheMapper.toCache(inv),
            });
          }
          return items;
        });

        await this.cacheService.setAll(entries, {
          ttl: INVENTORY_REDIS.EXPIRATION,
          nx: true,
        });
      }

      return Result.success<Inventory[]>(inventories);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find low stock inventories',
        error,
      );
    }
  }

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
  > {
    return await this.postgresRepo.findByIdForUpdate(id);
  }

  async findByProductIdForUpdate(
    productId: number,
  ): Promise<
    Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
  > {
    return await this.postgresRepo.findByProductIdForUpdate(productId);
  }

  async findMany(
    query?: InventorySearchQuery,
  ): Promise<Result<Inventory[], RepositoryError>> {
    return await this.postgresRepo.findMany(query);
  }

  async findBatch(
    query?: InventoryBatchQuery,
  ): Promise<Result<Inventory[], RepositoryError>> {
    return await this.postgresRepo.findBatch(query);
  }

  async save(
    inventory: Inventory,
    expectedVersion?: number,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.save(inventory, expectedVersion);
      if (dbResult.isFailure) return dbResult;

      const savedInventory = dbResult.value;
      if (savedInventory.id) {
        await this.cacheService.set(
          this.idKey(savedInventory.id),
          InventoryCacheMapper.toCache(savedInventory),
          {
            ttl: INVENTORY_REDIS.EXPIRATION,
          },
        );
      }

      await this.cacheService.set(
        this.productKey(savedInventory.productId),
        InventoryCacheMapper.toCache(savedInventory),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      await this.cacheService.delete(INVENTORY_REDIS.IS_CACHED_FLAG);
      return Result.success(savedInventory);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save inventory', error);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<InventoryForCache>(
        this.idKey(id),
      );

      if (cached) {
        await this.cacheService.delete(this.productKey(cached.productId));
      }

      const dbResult = await this.postgresRepo.delete(id);
      if (dbResult.isFailure) return dbResult;

      await this.cacheService.delete(this.idKey(id));

      await this.cacheService.delete(INVENTORY_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete inventory', error);
    }
  }
}
