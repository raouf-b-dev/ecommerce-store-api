// src\modules\products\infrastructure\repositories\RedisProductRepository\redis.product-repository.ts
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Product_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { IProduct } from '../../../domain/interfaces/IProduct';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

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
        `${Product_REDIS.CACHE_KEY}:${product.id}`,
        product,
        { ttl: Product_REDIS.EXPIRATION },
      );
      await this.cacheService.delete(Product_REDIS.IS_CACHED_FLAG);

      return Result.success<IProduct>(product);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save product`, error);
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Result<IProduct, RepositoryError>> {
    try {
      // Update in Postgres
      const updateResult = await this.postgresRepo.update(id, updateProductDto);
      if (updateResult.isFailure) return updateResult;

      const product = updateResult.value;
      // Update in cache
      await this.cacheService.set(`${Product_REDIS.CACHE_KEY}:${id}`, product, {
        ttl: Product_REDIS.EXPIRATION,
      });
      // Invalidate the list cache
      await this.cacheService.delete(Product_REDIS.IS_CACHED_FLAG);

      return Result.success<IProduct>(product);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update product`, error);
    }
  }

  async findById(id: string): Promise<Result<IProduct, RepositoryError>> {
    try {
      // Try cache first
      const cached = await this.cacheService.get<IProduct>(
        `${Product_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success<IProduct>(cached);
      }

      // Fallback to Postgres
      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      // Cache the result
      await this.cacheService.set(
        `${Product_REDIS.CACHE_KEY}:${id}`,
        dbResult.value,
        { ttl: Product_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find product`, error);
    }
  }

  async findAll(): Promise<Result<IProduct[], RepositoryError>> {
    try {
      const isCached = await this.cacheService.get<string>(
        Product_REDIS.IS_CACHED_FLAG,
      );

      if (isCached) {
        const cachedProducts = await this.cacheService.getAll<IProduct>(
          Product_REDIS.INDEX,
        );
        return Result.success(cachedProducts);
      }

      const dbResult = await this.postgresRepo.findAll();
      if (dbResult.isFailure) {
        return dbResult;
      }

      const products = dbResult.value;

      const cacheEntries = products.map((product) => ({
        key: `${Product_REDIS.CACHE_KEY}:${product.id}`,
        value: product,
      }));

      await this.cacheService.setAll(cacheEntries, {
        ttl: Product_REDIS.EXPIRATION,
      });

      await this.cacheService.set(Product_REDIS.IS_CACHED_FLAG, 'true', {
        ttl: Product_REDIS.EXPIRATION,
      });

      return Result.success(products);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find all products`, error);
    }
  }

  async deleteById(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.deleteById(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${Product_REDIS.CACHE_KEY}:${id}`);
      await this.cacheService.delete(Product_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete product`, error);
    }
  }
}
