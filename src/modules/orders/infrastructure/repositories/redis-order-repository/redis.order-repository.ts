// src/order/infrastructure/redis-order.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ORDER_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { AggregatedOrderInput } from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import {
  OrderForCache,
  OrderCacheMapper,
} from '../../persistence/mappers/order.mapper';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { Order } from '../../../domain/entities/order';
import { OrderStatus } from '../../../domain/value-objects/order-status';

@Injectable()
export class RedisOrderRepository implements OrderRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: OrderRepository,
    private readonly logger: Logger,
  ) {}

  async listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<Order[], RepositoryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        customerId,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = listOrdersQueryDto;

      const hasFilters = customerId || status;

      const shouldUseCache =
        !hasFilters &&
        page === 1 &&
        limit === 10 &&
        sortBy === 'createdAt' &&
        sortOrder === 'desc';

      if (shouldUseCache) {
        try {
          const isCached = await this.cacheService.get<string>(
            ORDER_REDIS.IS_CACHED_FLAG,
          );

          if (isCached) {
            const rawCachedOrders =
              await this.cacheService.getAll<OrderForCache>(
                ORDER_REDIS.INDEX,
                '*',
                { page, limit, sortBy, sortOrder },
              );
            const orders: Order[] = rawCachedOrders.map((order) =>
              OrderCacheMapper.fromCache(order),
            );
            return Result.success<Order[]>(orders);
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

  async save(order: Order): Promise<Result<Order, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(order);
      if (saveResult.isFailure) return saveResult;
      const savedOrder = saveResult.value;

      await this.cacheService.set(
        `${ORDER_REDIS.CACHE_KEY}:${savedOrder.id}`,
        OrderCacheMapper.toCache(savedOrder),
        { ttl: ORDER_REDIS.EXPIRATION },
      );
      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success<Order>(savedOrder);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save order`, error);
    }
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.updateStatus(id, status);
      if (updateResult.isFailure) return updateResult;

      const cached = await this.cacheService.get<OrderForCache>(
        `${ORDER_REDIS.CACHE_KEY}:${id}`,
      );

      if (cached) {
        cached.status = status;
        cached.updatedAt = Date.now();
        await this.cacheService.set(`${ORDER_REDIS.CACHE_KEY}:${id}`, cached, {
          ttl: ORDER_REDIS.EXPIRATION,
        });
      }

      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        `Failed to update order status`,
        error,
      );
    }
  }

  async updatePaymentId(
    orderId: string,
    paymentId: string,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.updatePaymentId(
        orderId,
        paymentId,
      );
      if (updateResult.isFailure) return updateResult;

      const cached = await this.cacheService.get<OrderForCache>(
        `${ORDER_REDIS.CACHE_KEY}:${orderId}`,
      );

      if (cached) {
        cached.paymentId = paymentId;
        cached.updatedAt = Date.now();
        await this.cacheService.set(
          `${ORDER_REDIS.CACHE_KEY}:${orderId}`,
          cached,
          {
            ttl: ORDER_REDIS.EXPIRATION,
          },
        );
      }

      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        `Failed to update order payment ID`,
        error,
      );
    }
  }

  async updateItemsInfo(
    id: string,
    updateOrderItemDto: CreateOrderItemDto[],
  ): Promise<Result<Order, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.updateItemsInfo(
        id,
        updateOrderItemDto,
      );
      if (updateResult.isFailure) return updateResult;

      const order = updateResult.value;

      await this.cacheService.set(
        `${ORDER_REDIS.CACHE_KEY}:${id}`,
        OrderCacheMapper.toCache(order),
        {
          ttl: ORDER_REDIS.EXPIRATION,
        },
      );
      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success<Order>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update order`, error);
    }
  }

  async findById(id: string): Promise<Result<Order, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<OrderForCache>(
        `${ORDER_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success<Order>(OrderCacheMapper.fromCache(cached));
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

  async deleteById(id: string): Promise<Result<void, RepositoryError>> {
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

  async cancelOrder(
    orderPrimitives: Order,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const cancelResult = await this.postgresRepo.cancelOrder(orderPrimitives);
      if (cancelResult.isFailure) return cancelResult;
      await this.cacheService.delete(
        `${ORDER_REDIS.CACHE_KEY}:${orderPrimitives.id}`,
      );
      await this.cacheService.delete(ORDER_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to cancel order`, error);
    }
  }
}
