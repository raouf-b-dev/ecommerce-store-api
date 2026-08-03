// src\modules\products\infrastructure\repositories\CachedProductRepository\cached.product-repository.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CachePort } from '../../../../../infrastructure/redis/cache/cache.port';
import { PRODUCT_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { Product } from '../../../core/domain/entities/product';
import { ProductRepository } from '../../../core/domain/repositories/product-repository';
import { IProduct } from '../../../core/domain/interfaces/product.interface';

export class CachedProductRepository implements ProductRepository {
  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: ProductRepository,
  ) {}

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Product; expectedVersion: number }, RepositoryError>
  > {
    return await this.postgresRepo.findByIdForUpdate(id);
  }

  async save(
    product: Product,
    expectedVersion?: number,
  ): Promise<Result<Product, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(product, expectedVersion);
      if (saveResult.isFailure) return saveResult;

      const savedProduct = saveResult.value;
      if (savedProduct.id !== null) {
        await this.cacheService.set(
          `${PRODUCT_REDIS.CACHE_KEY}:${savedProduct.id}`,
          savedProduct.toPrimitives(),
          { ttl: PRODUCT_REDIS.EXPIRATION },
        );
      }
      await this.cacheService.delete(PRODUCT_REDIS.IS_CACHED_FLAG);

      return Result.success(savedProduct);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save product`, error);
    }
  }

  async findById(id: number): Promise<Result<Product, RepositoryError>> {
    try {
      // Try cache first
      const cached = await this.cacheService.get<IProduct>(
        `${PRODUCT_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success<Product>(Product.fromPrimitives(cached));
      }

      // Fallback to Postgres
      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      // Cache the result
      await this.cacheService.set(
        `${PRODUCT_REDIS.CACHE_KEY}:${id}`,
        dbResult.value.toPrimitives(),
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find product`, error);
    }
  }

  async findAll(): Promise<Result<Product[], RepositoryError>> {
    try {
      const isCached = await this.cacheService.get<string>(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );

      if (isCached) {
        const cachedPrimitives = await this.cacheService.getAll<IProduct>(
          PRODUCT_REDIS.INDEX,
        );
        const products = cachedPrimitives.map((p) => Product.fromPrimitives(p));
        return Result.success(products);
      }

      const dbResult = await this.postgresRepo.findAll();
      if (dbResult.isFailure) {
        return dbResult;
      }

      const products = dbResult.value;

      const cacheEntries = products.map((product) => ({
        key: `${PRODUCT_REDIS.CACHE_KEY}:${product.id}`,
        value: product.toPrimitives(),
      }));

      await this.cacheService.setAll(cacheEntries, {
        ttl: PRODUCT_REDIS.EXPIRATION,
      });

      await this.cacheService.set(PRODUCT_REDIS.IS_CACHED_FLAG, 'true', {
        ttl: PRODUCT_REDIS.EXPIRATION,
      });

      return Result.success(products);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find all products`, error);
    }
  }

  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.deleteById(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${PRODUCT_REDIS.CACHE_KEY}:${id}`);
      await this.cacheService.delete(PRODUCT_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete product`, error);
    }
  }
}
