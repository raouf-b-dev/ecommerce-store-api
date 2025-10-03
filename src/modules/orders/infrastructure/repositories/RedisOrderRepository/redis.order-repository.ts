// src/order/infrastructure/redis-order.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { AggregatedOrderInput } from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import {
  OrderForCache,
  OrderCacheMapper,
} from '../../persistence/mappers/order.mapper';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';

@Injectable()
export class RedisOrderRepository implements OrderRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: OrderRepository,
    private readonly logger: Logger,
  ) {}

  async listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], RepositoryError>> {
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
            Order_REDIS.IS_CACHED_FLAG,
          );

          if (isCached) {
            const rawCachedOrders =
              await this.cacheService.getAll<OrderForCache>(
                Order_REDIS.INDEX,
                '*',
                { page, limit, sortBy, sortOrder },
              );
            const orders = rawCachedOrders.map(OrderCacheMapper.fromCache);
            return Result.success<IOrder[]>(orders);
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
            key: `${Order_REDIS.CACHE_KEY}:${order.id}`,
            value: OrderCacheMapper.toCache(order),
          }));
          await this.cacheService.setAll(cacheEntries, {
            ttl: Order_REDIS.EXPIRATION,
            nx: true,
          });
          await this.cacheService.set(Order_REDIS.IS_CACHED_FLAG, 'true', {
            ttl: Order_REDIS.EXPIRATION,
          });
        } catch (cacheError) {
          this.logger.warn('Failed to cache orders:', cacheError);
        }
      }
      return Result.success<IOrder[]>(orders);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to list orders', error);
    }
  }

  async save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(createOrderDto);
      if (saveResult.isFailure) return saveResult;
      const order = saveResult.value;

      await this.cacheService.set(
        `${Order_REDIS.CACHE_KEY}:${order.id}`,
        OrderCacheMapper.toCache(order),
        { ttl: Order_REDIS.EXPIRATION },
      );
      await this.cacheService.delete(Order_REDIS.IS_CACHED_FLAG);

      return Result.success<IOrder>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to save order`, error);
    }
  }

  async updateItemsInfo(
    id: string,
    updateOrderItemDto: CreateOrderItemDto[],
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.updateItemsInfo(
        id,
        updateOrderItemDto,
      );
      if (updateResult.isFailure) return updateResult;

      const order = updateResult.value;

      await this.cacheService.set(
        `${Order_REDIS.CACHE_KEY}:${id}`,
        OrderCacheMapper.toCache(order),
        {
          ttl: Order_REDIS.EXPIRATION,
        },
      );
      await this.cacheService.delete(Order_REDIS.IS_CACHED_FLAG);

      return Result.success<IOrder>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to update order`, error);
    }
  }

  async findById(id: string): Promise<Result<IOrder, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<OrderForCache>(
        `${Order_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success<IOrder>(OrderCacheMapper.fromCache(cached));
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;
      const order = dbResult.value;

      await this.cacheService.set(
        `${Order_REDIS.CACHE_KEY}:${id}`,
        OrderCacheMapper.toCache(order),
        { ttl: Order_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to find order`, error);
    }
  }

  async deleteById(id: string): Promise<Result<void, RepositoryError>> {
    try {
      // Delete from Postgres
      const deleteResult = await this.postgresRepo.deleteById(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${Order_REDIS.CACHE_KEY}:${id}`);
      await this.cacheService.delete(Order_REDIS.IS_CACHED_FLAG);

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to delete order`, error);
    }
  }

  async cancelById(id: string): Promise<Result<IOrder, RepositoryError>> {
    try {
      const cancelResult = await this.postgresRepo.cancelById(id);
      if (cancelResult.isFailure) return cancelResult;
      await this.cacheService.delete(`${Order_REDIS.CACHE_KEY}:${id}`);
      await this.cacheService.delete(Order_REDIS.IS_CACHED_FLAG);

      return Result.success<IOrder>(cancelResult.value);
    } catch (error) {
      return ErrorFactory.RepositoryError(`Failed to cancel order`, error);
    }
  }
}
