// src\modules\products\infrastructure\repositories\CachedProductRepository\cached.product-repository.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import { PRODUCT_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { Product } from '../../../core/domain/entities/product';
import { ProductRepository } from '../../../core/domain/repositories/product-repository';
import { IProduct } from '../../../core/domain/interfaces/product.interface';
import { ProductCacheMapper } from '../../persistence/mappers/product.mapper';

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
          ProductCacheMapper.toCache(savedProduct),
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
        return Result.success<Product>(ProductCacheMapper.fromCache(cached));
      }

      // Fallback to Postgres
      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      // Cache the result
      await this.cacheService.set(
        `${PRODUCT_REDIS.CACHE_KEY}:${id}`,
        ProductCacheMapper.toCache(dbResult.value),
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find product`, error);
    }
  }

  async findByIds(ids: number[]): Promise<Result<Product[], RepositoryError>> {
    try {
      if (ids.length === 0) return Result.success([]);
      const uniqueIds = [...new Set(ids)];
      const cacheKeys = uniqueIds.map(
        (id) => `${PRODUCT_REDIS.CACHE_KEY}:${id}`,
      );

      // Perform a single Redis JSON MGET command for all keys
      const cachedResults = await this.cacheService.getMany<
        IProduct | IProduct[]
      >(cacheKeys);

      const foundProducts: Product[] = [];
      const missingIds: number[] = [];

      uniqueIds.forEach((id, index) => {
        const rawCached = cachedResults[index];
        const cached: IProduct | null = Array.isArray(rawCached)
          ? rawCached[0] || null
          : rawCached || null;

        if (cached) {
          foundProducts.push(ProductCacheMapper.fromCache(cached));
        } else {
          missingIds.push(id);
        }
      });

      if (missingIds.length > 0) {
        const dbResult = await this.postgresRepo.findByIds(missingIds);
        if (dbResult.isFailure) return dbResult;

        const fetchedFromDb = dbResult.value;
        foundProducts.push(...fetchedFromDb);

        const cacheEntries = fetchedFromDb.map((product) => ({
          key: `${PRODUCT_REDIS.CACHE_KEY}:${product.id}`,
          value: ProductCacheMapper.toCache(product),
        }));

        if (cacheEntries.length > 0) {
          await this.cacheService.setAll(cacheEntries, {
            ttl: PRODUCT_REDIS.EXPIRATION,
          });
        }
      }

      return Result.success(foundProducts);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find products by IDs',
        error,
      );
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
        const products = cachedPrimitives.map((p) =>
          ProductCacheMapper.fromCache(p),
        );
        return Result.success(products);
      }

      const dbResult = await this.postgresRepo.findAll();
      if (dbResult.isFailure) {
        return dbResult;
      }

      const products = dbResult.value;

      const cacheEntries = products.map((product) => ({
        key: `${PRODUCT_REDIS.CACHE_KEY}:${product.id}`,
        value: ProductCacheMapper.toCache(product),
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
