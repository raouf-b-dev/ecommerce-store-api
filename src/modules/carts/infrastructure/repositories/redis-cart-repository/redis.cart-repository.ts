// src/modules/carts/infrastructure/repositories/redis-cart-repository/redis.cart-repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { CART_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Cart } from '../../../domain/entities/cart';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  CartCacheMapper,
  CartForCache,
} from '../../persistence/mappers/cart.mapper';

import { CreateCartDto } from '../../../presentation/dto/create-cart.dto';

@Injectable()
export class RedisCartRepository implements CartRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: CartRepository,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<Result<Cart, RepositoryError>> {
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

  async findByCustomerId(
    customerId: string,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const cachedCarts = await this.cacheService.search<CartForCache>(
        CART_REDIS.INDEX,
        `@customerId:${customerId}`,
      );

      if (cachedCarts.length > 0) {
        return Result.success(CartCacheMapper.fromCache(cachedCarts[0]));
      }

      const dbResult = await this.postgresRepo.findByCustomerId(customerId);
      if (dbResult.isFailure) return dbResult;
      const cart = dbResult.value;

      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${cart.id}`,
        CartCacheMapper.toCache(cart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by customer ID',
        error,
      );
    }
  }

  async findBySessionId(
    sessionId: string,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const cachedCarts = await this.cacheService.search<CartForCache>(
        CART_REDIS.INDEX,
        `@sessionId:${sessionId}`,
      );

      if (cachedCarts.length > 0) {
        return Result.success(CartCacheMapper.fromCache(cachedCarts[0]));
      }

      const dbResult = await this.postgresRepo.findBySessionId(sessionId);
      if (dbResult.isFailure) return dbResult;
      const cart = dbResult.value;

      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${cart.id}`,
        CartCacheMapper.toCache(cart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by session ID',
        error,
      );
    }
  }

  async create(dto: CreateCartDto): Promise<Result<Cart, RepositoryError>> {
    try {
      const createResult = await this.postgresRepo.create(dto);
      if (createResult.isFailure) return createResult;
      const savedCart = createResult.value;

      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${savedCart.id}`,
        CartCacheMapper.toCache(savedCart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return Result.success(savedCart);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to create cart', error);
    }
  }

  async update(cart: Cart): Promise<Result<Cart, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.update(cart);
      if (updateResult.isFailure) return updateResult;
      const updatedCart = updateResult.value;

      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${updatedCart.id}`,
        CartCacheMapper.toCache(updatedCart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return Result.success(updatedCart);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update cart', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.delete(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${CART_REDIS.CACHE_KEY}:${id}`);

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete cart', error);
    }
  }

  async mergeCarts(
    guestCart: Cart,
    userCart: Cart,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      const mergeResult = await this.postgresRepo.mergeCarts(
        guestCart,
        userCart,
      );
      if (mergeResult.isFailure) return mergeResult;
      const mergedCart = mergeResult.value;

      // Invalidate guest cart cache
      await this.cacheService.delete(`${CART_REDIS.CACHE_KEY}:${guestCart.id}`);

      // Update user cart cache
      await this.cacheService.set(
        `${CART_REDIS.CACHE_KEY}:${mergedCart.id}`,
        CartCacheMapper.toCache(mergedCart),
        { ttl: CART_REDIS.EXPIRATION },
      );

      return Result.success(mergedCart);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to merge carts', error);
    }
  }
}
