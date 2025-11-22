import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Payment } from '../../../domain/entities/payment';
import {
  PaymentCacheMapper,
  PaymentForCache,
} from '../../persistence/mappers/payment.mapper';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { PAYMENT_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { PaymentBuilder } from '../../../testing/builders/payment.test.builder';
import { MockPaymentRepository } from '../../../testing/mocks/payment-repository.mock';
import { RedisPaymentRepository } from './redis.payment-repository';
import { PaymentTestFactory } from '../../../testing/factories/payment.test.factory';
import { RefundTestFactory } from '../../../testing/factories/refund.test.factory';
import { Refund } from '../../../domain/entities/refund';
import { Logger } from '@nestjs/common';

describe('RedisPaymentRepository', () => {
  let repository: RedisPaymentRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: MockPaymentRepository;
  let logger: jest.Mocked<Logger>;

  const paymentId = 'PA0000001';
  const orderId = 'OR0000001';
  const transactionId = 'tx_123';
  const paymentPrimitives = new PaymentBuilder()
    .withId(paymentId)
    .withOrderId(orderId)
    .withTransactionId(transactionId)
    .asCompleted()
    .build();
  const domainPayment = Payment.fromPrimitives(paymentPrimitives);
  const cachedPayment: PaymentForCache =
    PaymentCacheMapper.toCache(domainPayment);

  const idKey = (id: string) => `${PAYMENT_REDIS.CACHE_KEY}:${id}`;

  beforeEach(() => {
    // Mock CacheService methods
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      setAll: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<CacheService>;

    postgresRepo = new MockPaymentRepository();
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    repository = new RedisPaymentRepository(cacheService, postgresRepo, logger);
    jest.clearAllMocks();
  });

  // --- FindById Tests ---
  describe('findById', () => {
    it('should return payment from cache on cache hit and not call postgres', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(cachedPayment);

      // Act
      const result = await repository.findById(paymentId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainPayment);
      expect(cacheService.get).toHaveBeenCalledWith(idKey(paymentId));
      expect(postgresRepo.findById).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should fetch from postgres, cache the result, and return payment on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      postgresRepo.mockSuccessfulFindById(paymentPrimitives);

      // Act
      const result = await repository.findById(paymentId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainPayment);
      expect(postgresRepo.findById).toHaveBeenCalledWith(paymentId);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(paymentId),
        cachedPayment,
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres lookup fails on cache miss', async () => {
      // Arrange
      cacheService.get.mockResolvedValueOnce(null);
      const dbError = new RepositoryError('DB error');
      postgresRepo.findById.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.findById(paymentId);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.findById).toHaveBeenCalledWith(paymentId);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return a RepositoryError if cacheService.get throws an error', async () => {
      // Arrange
      const error = new Error('Redis connection failed');
      cacheService.get.mockRejectedValue(error);

      // Act
      const result = await repository.findById(paymentId);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find payment',
        RepositoryError,
        error,
      );
    });
  });

  // --- FindByOrderId Tests ---
  describe('findByOrderId', () => {
    it('should return payments from cache on cache hit and not call postgres', async () => {
      // Arrange
      cacheService.search.mockResolvedValueOnce([cachedPayment]);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([domainPayment]);
      expect(cacheService.search).toHaveBeenCalledWith(
        PAYMENT_REDIS.INDEX,
        `@orderId:${orderId}`,
      );
      expect(postgresRepo.findByOrderId).not.toHaveBeenCalled();
    });

    it('should fetch from postgres, cache individual items, and return payments on cache miss', async () => {
      // Arrange
      cacheService.search.mockResolvedValueOnce([]);
      postgresRepo.mockSuccessfulFindByOrderId([paymentPrimitives]);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([domainPayment]);
      expect(postgresRepo.findByOrderId).toHaveBeenCalledWith(orderId);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(paymentId),
        cachedPayment,
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres lookup fails on cache miss', async () => {
      // Arrange
      cacheService.search.mockResolvedValueOnce([]);
      const dbError = new RepositoryError('DB error');
      postgresRepo.findByOrderId.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.findByOrderId).toHaveBeenCalledWith(orderId);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  // --- FindByTransactionId Tests ---
  describe('findByTransactionId', () => {
    it('should return payment from cache on cache hit and not call postgres', async () => {
      // Arrange
      cacheService.search.mockResolvedValueOnce([cachedPayment]);

      // Act
      const result = await repository.findByTransactionId(transactionId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainPayment);
      expect(cacheService.search).toHaveBeenCalledWith(
        PAYMENT_REDIS.INDEX,
        `@transactionId:${transactionId}`,
      );
      expect(postgresRepo.findByTransactionId).not.toHaveBeenCalled();
    });

    it('should fetch from postgres, cache the result, and return payment on cache miss', async () => {
      // Arrange
      cacheService.search.mockResolvedValueOnce([]);
      postgresRepo.findByTransactionId.mockResolvedValue(
        Result.success(domainPayment),
      );

      // Act
      const result = await repository.findByTransactionId(transactionId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(domainPayment);
      expect(postgresRepo.findByTransactionId).toHaveBeenCalledWith(
        transactionId,
      );

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(paymentId),
        cachedPayment,
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );
    });
  });

  // --- Save Tests ---
  describe('save', () => {
    it('should save to postgres and cache the result', async () => {
      // Arrange
      const newPayment = new PaymentBuilder().withId('PA_NEW').build();
      const newDomainPayment = Payment.fromPrimitives(newPayment);
      const newCachedPayment = PaymentCacheMapper.toCache(newDomainPayment);

      postgresRepo.mockSuccessfulSave(newDomainPayment);

      // Act
      const result = await repository.save(newDomainPayment);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(newDomainPayment);
      expect(postgresRepo.save).toHaveBeenCalledWith(newDomainPayment);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(newPayment.id),
        newCachedPayment,
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres save fails', async () => {
      // Arrange
      const dbError = new RepositoryError('Save failed');
      postgresRepo.save.mockResolvedValue(Result.failure(dbError));

      // Act
      const result = await repository.save(domainPayment);

      // Assert
      ResultAssertionHelper.assertResultFailureWithError(result, dbError);
      expect(postgresRepo.save).toHaveBeenCalledWith(domainPayment);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  // --- Update Tests ---
  describe('update', () => {
    it('should update in postgres and cache the new result', async () => {
      // Arrange
      const updatedPayment = domainPayment;
      const updatedCachedPayment = PaymentCacheMapper.toCache(updatedPayment);

      postgresRepo.update.mockResolvedValue(Result.success(updatedPayment));

      // Act
      const result = await repository.update(updatedPayment);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(updatedPayment);
      expect(postgresRepo.update).toHaveBeenCalledWith(updatedPayment);

      expect(cacheService.set).toHaveBeenCalledWith(
        idKey(updatedPayment.id),
        updatedCachedPayment,
        { ttl: PAYMENT_REDIS.EXPIRATION },
      );
    });
  });

  // --- Delete Tests ---
  describe('delete', () => {
    it('should delete from postgres and delete the cache key', async () => {
      // Arrange
      postgresRepo.mockSuccessfulDelete();

      // Act
      const result = await repository.delete(paymentId);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.delete).toHaveBeenCalledWith(paymentId);
      expect(cacheService.delete).toHaveBeenCalledWith(idKey(paymentId));
    });
  });

  // --- SaveRefund Tests ---
  describe('saveRefund', () => {
    it('should save refund to postgres and invalidate payment cache', async () => {
      // Arrange
      const refundProps = RefundTestFactory.createMockRefund({ paymentId });
      const refund = Refund.fromPrimitives(refundProps);

      postgresRepo.mockSuccessfulSaveRefund(refund);

      // Act
      const result = await repository.saveRefund(refund);

      // Assert
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(refund);
      expect(postgresRepo.saveRefund).toHaveBeenCalledWith(refund);
      expect(cacheService.delete).toHaveBeenCalledWith(idKey(paymentId));
    });
  });
});
