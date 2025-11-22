import { Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { PAYMENT_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Payment } from '../../../domain/entities/payment';
import { Refund } from '../../../domain/entities/refund';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import {
  PaymentCacheMapper,
  PaymentForCache,
} from '../../persistence/mappers/payment.mapper';

@Injectable()
export class RedisPaymentRepository implements PaymentRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: PaymentRepository,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<Result<Payment, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<PaymentForCache>(
        `${PAYMENT_REDIS.CACHE_KEY}:${id}`,
      );
      if (cached) {
        return Result.success(PaymentCacheMapper.fromCache(cached));
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;
      const payment = dbResult.value;

      await this.cacheService.set(
        `${PAYMENT_REDIS.CACHE_KEY}:${id}`,
        PaymentCacheMapper.toCache(payment),
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find payment', error);
    }
  }

  async findByOrderId(
    orderId: string,
  ): Promise<Result<Payment[], RepositoryError>> {
    try {
      const cachedPayments = await this.cacheService.search<PaymentForCache>(
        PAYMENT_REDIS.INDEX,
        `@orderId:${orderId}`,
      );

      if (cachedPayments.length > 0) {
        return Result.success(
          cachedPayments.map((p) => PaymentCacheMapper.fromCache(p)),
        );
      }

      const dbResult = await this.postgresRepo.findByOrderId(orderId);
      if (dbResult.isFailure) return dbResult;
      const payments = dbResult.value;

      // Cache individual items
      for (const payment of payments) {
        await this.cacheService.set(
          `${PAYMENT_REDIS.CACHE_KEY}:${payment.id}`,
          PaymentCacheMapper.toCache(payment),
          { ttl: PAYMENT_REDIS.EXPIRATION },
        );
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find payments by order ID',
        error,
      );
    }
  }

  async findByTransactionId(
    transactionId: string,
  ): Promise<Result<Payment, RepositoryError>> {
    try {
      const cachedPayments = await this.cacheService.search<PaymentForCache>(
        PAYMENT_REDIS.INDEX,
        `@transactionId:${transactionId}`,
      );

      if (cachedPayments.length > 0) {
        return Result.success(PaymentCacheMapper.fromCache(cachedPayments[0]));
      }

      const dbResult =
        await this.postgresRepo.findByTransactionId(transactionId);
      if (dbResult.isFailure) return dbResult;
      const payment = dbResult.value;

      await this.cacheService.set(
        `${PAYMENT_REDIS.CACHE_KEY}:${payment.id}`,
        PaymentCacheMapper.toCache(payment),
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find payment by transaction ID',
        error,
      );
    }
  }

  async findByCustomerId(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<Result<{ items: Payment[]; total: number }, RepositoryError>> {
    return this.postgresRepo.findByCustomerId(customerId, page, limit);
  }

  async save(payment: Payment): Promise<Result<Payment, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.save(payment);
      if (saveResult.isFailure) return saveResult;
      const savedPayment = saveResult.value;

      await this.cacheService.set(
        `${PAYMENT_REDIS.CACHE_KEY}:${savedPayment.id}`,
        PaymentCacheMapper.toCache(savedPayment),
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );

      return Result.success(savedPayment);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save payment', error);
    }
  }

  async update(payment: Payment): Promise<Result<Payment, RepositoryError>> {
    try {
      const updateResult = await this.postgresRepo.update(payment);
      if (updateResult.isFailure) return updateResult;
      const updatedPayment = updateResult.value;

      await this.cacheService.set(
        `${PAYMENT_REDIS.CACHE_KEY}:${updatedPayment.id}`,
        PaymentCacheMapper.toCache(updatedPayment),
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );

      return Result.success(updatedPayment);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update payment', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.postgresRepo.delete(id);
      if (deleteResult.isFailure) return deleteResult;

      await this.cacheService.delete(`${PAYMENT_REDIS.CACHE_KEY}:${id}`);

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete payment', error);
    }
  }

  async findRefundById(
    refundId: string,
  ): Promise<Result<Refund, RepositoryError>> {
    return this.postgresRepo.findRefundById(refundId);
  }

  async saveRefund(refund: Refund): Promise<Result<Refund, RepositoryError>> {
    try {
      const saveResult = await this.postgresRepo.saveRefund(refund);
      if (saveResult.isFailure) return saveResult;

      await this.cacheService.delete(
        `${PAYMENT_REDIS.CACHE_KEY}:${refund.paymentId}`,
      );

      return Result.success(saveResult.value);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save refund', error);
    }
  }
}
