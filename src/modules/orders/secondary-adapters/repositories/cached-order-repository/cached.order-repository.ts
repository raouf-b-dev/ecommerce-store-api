// src/order/infrastructure/redis-order.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  ListOrdersQuery,
  OrderRepository,
} from '../../../core/domain/repositories/order-repository';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ORDER_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import {
  OrderCacheMapper,
  OrderForCache,
} from '../../persistence/mappers/order.mapper';
import { Order } from '../../../core/domain/entities/order';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';

@Injectable()
export class CachedOrderRepository implements OrderRepository {
  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: OrderRepository,
    private readonly logger: Logger,
  ) {}

  async listOrders(
    listOrdersQueryDto: ListOrdersQuery,
  ): Promise<Result<Order[], RepositoryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = listOrdersQueryDto;

      const hasFilters = userId || status;

      const shouldUseCache =
        !hasFilters &&
        page === 1 &&
        limit === 10 &&
        sortBy === 'createdAt' &&
        sortOrder === 'desc';

      if (shouldUseCache) {
        try {
          const isCachedFlag = await this.cacheService.get(
            ORDER_REDIS.IS_CACHED_FLAG,
          );
          const isCached = isCachedFlag === true || isCachedFlag === 'true';

          if (isCached) {
            const cached = await this.cacheService.search<OrderForCache>(
              ORDER_REDIS.INDEX,
              '*',
              {
                page,
                limit,
                sortBy,
                sortOrder,
              },
            );
            const orders: Order[] = [];
            let hasUnreadable = false;
            for (const entry of cached) {
              const order = OrderCacheMapper.fromCache(entry);
              if (!order) {
                hasUnreadable = true;
                break;
              }
              orders.push(order);
            }
            if (!hasUnreadable) {
              return Result.success(orders);
            }
            this.logger.warn(
              'Order list cache payload had unreadable entries — falling back to Postgres',
            );
          }
        } catch (cacheError) {
          this.logger.warn(
            'Cache lookup failed, falling back to database:',
            cacheError,
          );
        }
      }

      const dbResult = await this.postgresRepo.listOrders(listOrdersQueryDto);
      if (dbResult.isFailure) {
        return dbResult;
      }

      const orders = dbResult.value;

      if (shouldUseCache && orders.length > 0) {
        try {
          const cacheEntries = orders.map((order) => ({
            key: `${ORDER_REDIS.CACHE_KEY}:${order.id}`,
            value: OrderCacheMapper.toCache(order),
          }));
          await this.cacheService.setAll(cacheEntries, {
            ttl: ORDER_REDIS.EXPIRATION,
            nx: true,
          });
          await this.cacheService.set(ORDER_REDIS.IS_CACHED_FLAG, 'true', {
            ttl: ORDER_REDIS.EXPIRATION,
          });
        } catch (cacheError) {
          this.logger.warn('Failed to cache orders:', cacheError);
        }
      }
      return Result.success<Order[]>(orders);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to list orders', error);
    }
  }

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Order; expectedVersion: number }, RepositoryError>
  > {
    return await this.postgresRepo.findByIdForUpdate(id);
  }

  async save(
    order: Order,
    expectedVersion?: number,
  ): Promise<Result<Order, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(order, expectedVersion);
      if (saveResult.isFailure) return saveResult;

      const savedOrder = saveResult.value;
      if (savedOrder.id) {
        await this.cacheService.set(
          `${ORDER_REDIS.CACHE_KEY}:${savedOrder.id}`,
          OrderCacheMapper.toCache(savedOrder),
          { ttl: ORDER_REDIS.EXPIRATION },
        );
      }
      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success(saveResult.value);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save order`, error);
    }
  }

  async findById(id: number): Promise<Result<Order, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<OrderForCache>(
        `${ORDER_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        const order = OrderCacheMapper.fromCache(cached);
        if (order) return Result.success(order);
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;
      const order = dbResult.value;

      await this.cacheService.set(
        `${ORDER_REDIS.CACHE_KEY}:${id}`,
        OrderCacheMapper.toCache(order),
        { ttl: ORDER_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find order`, error);
    }
  }

  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.deleteById(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${ORDER_REDIS.CACHE_KEY}:${id}`);
      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete order`, error);
    }
  }

  async findByStatusBefore(
    status: OrderStatus,
    before: Date,
  ): Promise<Result<Order[], RepositoryError>> {
    // Delegate directly to Postgres - no caching for this query
    return this.postgresRepo.findByStatusBefore(status, before);
  }
}
