import { Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { CUSTOMER_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Customer } from '../../../domain/entities/customer';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import {
  CustomerCacheMapper,
  CustomerForCache,
} from '../../persistence/mappers/customer.mapper';

@Injectable()
export class RedisCustomerRepository implements CustomerRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: CustomerRepository,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<Result<Customer, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<CustomerForCache>(
        `${CUSTOMER_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success(CustomerCacheMapper.fromCache(cached));
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;
      const customer = dbResult.value;

      await this.cacheService.set(
        `${CUSTOMER_REDIS.CACHE_KEY}:${id}`,
        CustomerCacheMapper.toCache(customer),
        { ttl: CUSTOMER_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find customer', error);
    }
  }

  async findByEmail(email: string): Promise<Result<Customer, RepositoryError>> {
    try {
      const cachedCustomers = await this.cacheService.search<CustomerForCache>(
        CUSTOMER_REDIS.INDEX,
        `@email:${email}`,
      );

      if (cachedCustomers.length > 0) {
        return Result.success(
          CustomerCacheMapper.fromCache(cachedCustomers[0]),
        );
      }

      const dbResult = await this.postgresRepo.findByEmail(email);
      if (dbResult.isFailure) return dbResult;
      const customer = dbResult.value;

      await this.cacheService.set(
        `${CUSTOMER_REDIS.CACHE_KEY}:${customer.id}`,
        CustomerCacheMapper.toCache(customer),
        { ttl: CUSTOMER_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find customer by email',
        error,
      );
    }
  }

  async findByPhone(phone: string): Promise<Result<Customer, RepositoryError>> {
    try {
      const cachedCustomers = await this.cacheService.search<CustomerForCache>(
        CUSTOMER_REDIS.INDEX,
        `@phone:${phone}`,
      );

      if (cachedCustomers.length > 0) {
        return Result.success(
          CustomerCacheMapper.fromCache(cachedCustomers[0]),
        );
      }

      const dbResult = await this.postgresRepo.findByPhone(phone);
      if (dbResult.isFailure) return dbResult;
      const customer = dbResult.value;

      await this.cacheService.set(
        `${CUSTOMER_REDIS.CACHE_KEY}:${customer.id}`,
        CustomerCacheMapper.toCache(customer),
        { ttl: CUSTOMER_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find customer by phone',
        error,
      );
    }
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<Result<{ items: Customer[]; total: number }, RepositoryError>> {
    try {
      const shouldUseCache = page === 1 && limit === 10;

      if (shouldUseCache) {
        const isCached = await this.cacheService.get<string>(
          CUSTOMER_REDIS.IS_CACHED_FLAG,
        );

        if (isCached) {
          const offset = (page - 1) * limit;
          const cachedCustomers =
            await this.cacheService.search<CustomerForCache>(
              CUSTOMER_REDIS.INDEX,
              '*',
              {
                LIMIT: { from: offset, size: limit },
                SORTBY: { BY: 'createdAt', DIRECTION: 'DESC' },
              },
            );

          if (cachedCustomers.length > 0) {
            const items = cachedCustomers.map((c) =>
              CustomerCacheMapper.fromCache(c),
            );
            return Result.success({
              items,
              total: items.length, // Approximation as per current limitation
            });
          }
        }
      }

      const dbResult = await this.postgresRepo.findAll(page, limit);
      if (dbResult.isFailure) return dbResult;

      const { items } = dbResult.value;

      if (shouldUseCache && items.length > 0) {
        try {
          const cacheEntries = items.map((customer) => ({
            key: `${CUSTOMER_REDIS.CACHE_KEY}:${customer.id}`,
            value: CustomerCacheMapper.toCache(customer),
          }));

          await this.cacheService.setAll(cacheEntries, {
            ttl: CUSTOMER_REDIS.EXPIRATION,
            nx: true,
          });

          await this.cacheService.set(CUSTOMER_REDIS.IS_CACHED_FLAG, 'true', {
            ttl: CUSTOMER_REDIS.EXPIRATION,
          });
        } catch (cacheError) {
          this.logger.warn('Failed to cache customers list', cacheError);
        }
      }

      return dbResult;
    } catch (error) {
      this.logger.error('Redis search failed, falling back to DB', error);
      return this.postgresRepo.findAll(page, limit);
    }
  }

  async save(customer: Customer): Promise<Result<Customer, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(customer);
      if (saveResult.isFailure) return saveResult;
      const savedCustomer = saveResult.value;

      await this.cacheService.set(
        `${CUSTOMER_REDIS.CACHE_KEY}:${savedCustomer.id}`,
        CustomerCacheMapper.toCache(savedCustomer),
        { ttl: CUSTOMER_REDIS.EXPIRATION },
      );
      await this.cacheService.delete(CUSTOMER_REDIS.IS_CACHED_FLAG);

      return Result.success(savedCustomer);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save customer', error);
    }
  }

  async update(customer: Customer): Promise<Result<Customer, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.update(customer);
      if (updateResult.isFailure) return updateResult;
      const updatedCustomer = updateResult.value;

      await this.cacheService.set(
        `${CUSTOMER_REDIS.CACHE_KEY}:${updatedCustomer.id}`,
        CustomerCacheMapper.toCache(updatedCustomer),
        { ttl: CUSTOMER_REDIS.EXPIRATION },
      );
      await this.cacheService.delete(CUSTOMER_REDIS.IS_CACHED_FLAG);

      return Result.success(updatedCustomer);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update customer', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.delete(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${CUSTOMER_REDIS.CACHE_KEY}:${id}`);
      await this.cacheService.delete(CUSTOMER_REDIS.IS_CACHED_FLAG);

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete customer', error);
    }
  }
}
