// src\modules\products\infrastructure\repositories\RedisProductRepository\redis.product-repository.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { CacheService } from '../../../../../shared-kernel/infrastructure/redis/cache/cache.service';
import { PRODUCT_REDIS } from '../../../../../shared-kernel/infrastructure/redis/constants/redis.constants';
import { IProduct } from '../../../core/domain/interfaces/product.interface';
import { ProductRepository } from '../../../core/domain/repositories/product-repository';
import { CreateProductDto } from '../../../primary-adapters/dto/create-product.dto';
import { UpdateProductDto } from '../../../primary-adapters/dto/update-product.dto';

export class RedisProductRepository implements ProductRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: ProductRepository,
  ) {}

  async save(
    createProductDto: CreateProductDto,
  ): Promise<Result<IProduct, RepositoryError>> {
    try {
      // Save to Postgres first
      const saveResult = await this.postgresRepo.save(createProductDto);
      if (saveResult.isFailure) return saveResult;

      const product = saveResult.value;
      // Cache it
      await this.cacheService.set(
        `${PRODUCT_REDIS.CACHE_KEY}:${product.id}`,
        product,
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );
      await this.cacheService.delete(PRODUCT_REDIS.IS_CACHED_FLAG);

      return Result.success<IProduct>(product);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save product`, error);
    }
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Result<IProduct, RepositoryError>> {
    try {
      // Update in Postgres
      const updateResult = await this.postgresRepo.update(id, updateProductDto);
      if (updateResult.isFailure) return updateResult;

      const product = updateResult.value;
      // Update in cache
      await this.cacheService.set(`${PRODUCT_REDIS.CACHE_KEY}:${id}`, product, {
        ttl: PRODUCT_REDIS.EXPIRATION,
      });
      // Invalidate the list cache
      await this.cacheService.delete(PRODUCT_REDIS.IS_CACHED_FLAG);

      return Result.success<IProduct>(product);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update product`, error);
    }
  }

  async findById(id: number): Promise<Result<IProduct, RepositoryError>> {
    try {
      // Try cache first
      const cached = await this.cacheService.get<IProduct>(
        `${PRODUCT_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success<IProduct>(cached);
      }

      // Fallback to Postgres
      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      // Cache the result
      await this.cacheService.set(
        `${PRODUCT_REDIS.CACHE_KEY}:${id}`,
        dbResult.value,
        { ttl: PRODUCT_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find product`, error);
    }
  }

  async findAll(): Promise<Result<IProduct[], RepositoryError>> {
    try {
      const isCached = await this.cacheService.get<string>(
        PRODUCT_REDIS.IS_CACHED_FLAG,
      );

      if (isCached) {
        const cachedProducts = await this.cacheService.getAll<IProduct>(
          PRODUCT_REDIS.INDEX,
        );
        return Result.success(cachedProducts);
      }

      const dbResult = await this.postgresRepo.findAll();
      if (dbResult.isFailure) {
        return dbResult;
      }

      const products = dbResult.value;

      const cacheEntries = products.map((product) => ({
        key: `${PRODUCT_REDIS.CACHE_KEY}:${product.id}`,
        value: product,
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
