// src/modules/carts/infrastructure/repositories/cached-cart-repository/cached.cart-repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import { CART_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { Cart } from '../../../core/domain/entities/cart';
import { CartRepository } from '../../../core/domain/repositories/cart.repository';
import {
  CartCacheMapper,
  CartForCache,
} from '../../persistence/mappers/cart.mapper';

@Injectable()
export class CachedCartRepository implements CartRepository {
  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: CartRepository,
    private readonly logger: Logger,
  ) {}

  async findById(id: number): Promise<Result<Cart, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<CartForCache>(
        `${CART_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success(CartCacheMapper.fromCache(cached));
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;
      const cart = dbResult.value;

      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${id}`,
        CartCacheMapper.toCache(cart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find cart', error);
    }
  }

  async findByuserId(userId: number): Promise<Result<Cart, RepositoryError>> {
    try {
      const cachedCarts = await this.cacheService.search<CartForCache>(
        CART_REDIS.INDEX,
        `@userId:${userId}`,
      );

      if (cachedCarts.length > 0) {
        const cart = CartCacheMapper.fromCache(cachedCarts[0]);
        // Refresh TTL on cache hit
        await this.cacheService.set(
          `${CART_REDIS.CACHE_KEY}:${cart.id}`,
          CartCacheMapper.toCache(cart),
          { ttl: CART_REDIS.EXPIRATION },
        );
        return Result.success(cart);
      }

      const dbResult = await this.postgresRepo.findByuserId(userId);
      if (dbResult.isSuccess) {
        const cart = dbResult.value;

        await this.cacheService.set(
          `${CART_REDIS.CACHE_KEY}:${cart.id}`,
          CartCacheMapper.toCache(cart),
          { ttl: CART_REDIS.EXPIRATION },
        );

        return dbResult;
      }

      // Transparent auto-creation if cart expired/missing
      const freshCart = Cart.createUserCart(userId);
      const createResult = await this.postgresRepo.save(freshCart);
      if (createResult.isFailure) return createResult;

      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${freshCart.id}`,
        CartCacheMapper.toCache(freshCart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return Result.success(freshCart);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by user ID',
        error,
      );
    }
  }

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Cart; expectedVersion: number }, RepositoryError>
  > {
    return await this.postgresRepo.findByIdForUpdate(id);
  }

  async findByUserIdForUpdate(
    userId: number,
  ): Promise<
    Result<{ entity: Cart; expectedVersion: number }, RepositoryError>
  > {
    return await this.postgresRepo.findByUserIdForUpdate(userId);
  }

  async save(
    cart: Cart,
    expectedVersion?: number,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(cart, expectedVersion);
      if (saveResult.isFailure) return saveResult;

      const savedCart = saveResult.value;
      if (savedCart.id) {
        await this.cacheService.set(
          `${CART_REDIS.CACHE_KEY}:${savedCart.id}`,
          CartCacheMapper.toCache(savedCart),
          { ttl: CART_REDIS.EXPIRATION },
        );
      }

      return Result.success(savedCart);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save cart', error);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.delete(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${CART_REDIS.CACHE_KEY}:${id}`);

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete cart', error);
    }
  }
}
