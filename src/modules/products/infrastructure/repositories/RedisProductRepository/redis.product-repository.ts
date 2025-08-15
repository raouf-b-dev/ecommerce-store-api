// src\modules\products\infrastructure\repositories\RedisProductRepository\redis.product-repository.ts
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Product_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Product } from '../../../domain/entities/product';
import { ProductRepository } from '../../../domain/repositories/product-repository';

export class RedisProductRepository implements ProductRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: ProductRepository,
  ) {}
  async save(product: Product): Promise<Result<void, RepositoryError>> {
    try {
      // Save to Postgres first
      const saveResult = await this.postgresRepo.save(product);
      if (saveResult.isFailure) return saveResult;

      // Cache it
      await this.cacheService.set(
        `${Product_REDIS.CACHE_KEY}${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save order`, error);
    }
  }
  async update(product: Product): Promise<Result<void, RepositoryError>> {
    try {
      // Update in Postgres
      const updateResult = await this.postgresRepo.update(product);
      if (updateResult.isFailure) return updateResult;

      // Update in cache
      await this.cacheService.set(
        `${Product_REDIS.CACHE_KEY}${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update order`, error);
    }
  }
  async findById(id: number): Promise<Result<Product, RepositoryError>> {
    try {
      // Try cache first
      const cached = await this.cacheService.get<Product>(
        `${Product_REDIS.CACHE_KEY}${id}`,
      );
      if (cached) {
        return Result.success<Product>(cached);
      }

      // Fallback to Postgres
      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      // Cache the result
      await this.cacheService.set(
        `${Product_REDIS.CACHE_KEY}${id}`,
        dbResult.value,
        { ttl: Product_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find order`, error);
    }
  }
  async findAll(): Promise<Result<Product[], RepositoryError>> {
    try {
      // We could cache the list, but to avoid stale data let's go to Postgres
      const dbResult = await this.postgresRepo.findAll();
      if (dbResult.isFailure) return dbResult;

      // Optionally cache each order
      await Promise.all(
        dbResult.value.map((order) =>
          this.cacheService.set(
            `${Product_REDIS.CACHE_KEY}${order.id}`,
            order,
            {
              ttl: Product_REDIS.EXPIRATION,
            },
          ),
        ),
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find all orders`, error);
    }
  }
  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      // Delete from Postgres
      const deleteResult = await this.postgresRepo.deleteById(id);
      if (deleteResult.isFailure) return deleteResult;

      // Remove from cache
      await this.cacheService.delete(`${Product_REDIS.CACHE_KEY}${id}`);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete order`, error);
    }
  }
}
