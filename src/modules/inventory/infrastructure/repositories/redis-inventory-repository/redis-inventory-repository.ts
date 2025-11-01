// src/modules/inventory/infrastructure/repositories/redis-inventory.repository.ts
import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../../../domain/repositories/inventory.repository';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { INVENTORY_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import {
  InventoryForCache,
  InventoryCacheMapper,
} from '../../persistence/mappers/inventory.mapper';
import { Inventory } from '../../../domain/entities/inventory';

@Injectable()
export class RedisInventoryRepository implements InventoryRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: InventoryRepository,
  ) {}

  private idKey(id: string) {
    return `${INVENTORY_REDIS.CACHE_KEY}:${id}`;
  }

  private productKey(productId: string) {
    return `${INVENTORY_REDIS.CACHE_KEY}:product:${productId}`;
  }

  async findById(id: string): Promise<Result<Inventory, RepositoryError>> {
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

      await this.cacheService.set(
        this.idKey(inventory.id),
        InventoryCacheMapper.toCache(inventory),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

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
    productId: string,
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

      await this.cacheService.set(
        this.idKey(inventory.id),
        InventoryCacheMapper.toCache(inventory),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventory by product ID',
        error,
      );
    }
  }

  async findByProductIds(
    productIds: string[],
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      if (productIds.length === 0) return Result.success<Inventory[]>([]);

      const foundMap = new Map<string, Inventory>();
      const misses: string[] = [];

      await Promise.all(
        productIds.map(async (pid) => {
          const cached = await this.cacheService.get<InventoryForCache>(
            this.productKey(pid),
          );

          if (cached) {
            foundMap.set(pid, InventoryCacheMapper.fromCache(cached));
          } else {
            misses.push(pid);
          }
        }),
      );

      if (misses.length > 0) {
        const dbResult = await this.postgresRepo.findByProductIds(misses);
        if (dbResult.isFailure) return dbResult;

        const dbInventories = dbResult.value;
        const entries = dbInventories.flatMap((inv) => [
          {
            key: this.productKey(inv.productId),
            value: InventoryCacheMapper.toCache(inv),
          },
          { key: this.idKey(inv.id), value: InventoryCacheMapper.toCache(inv) },
        ]);

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
    threshold = 10,
    page = 1,
    limit = 20,
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.findLowStock(
        threshold,
        page,
        limit,
      );
      if (dbResult.isFailure) return dbResult;

      const inventories = dbResult.value;

      if (inventories.length > 0) {
        const entries = inventories.flatMap((inv) => [
          { key: this.idKey(inv.id), value: InventoryCacheMapper.toCache(inv) },
          {
            key: this.productKey(inv.productId),
            value: InventoryCacheMapper.toCache(inv),
          },
        ]);

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

  async save(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.save(inventory);
      if (dbResult.isFailure) return dbResult;

      const saved = dbResult.value;

      await this.cacheService.set(
        this.idKey(saved.id),
        InventoryCacheMapper.toCache(saved),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      await this.cacheService.set(
        this.productKey(saved.productId),
        InventoryCacheMapper.toCache(saved),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      await this.cacheService.delete(INVENTORY_REDIS.IS_CACHED_FLAG);
      return Result.success<Inventory>(saved);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save inventory', error);
    }
  }

  async update(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.update(inventory);
      if (dbResult.isFailure) return dbResult;

      const updated = dbResult.value;

      await this.cacheService.set(
        this.idKey(updated.id),
        InventoryCacheMapper.toCache(updated),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      await this.cacheService.set(
        this.productKey(updated.productId),
        InventoryCacheMapper.toCache(updated),
        {
          ttl: INVENTORY_REDIS.EXPIRATION,
        },
      );

      await this.cacheService.delete(INVENTORY_REDIS.IS_CACHED_FLAG);

      return Result.success<Inventory>(updated);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update inventory', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
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
