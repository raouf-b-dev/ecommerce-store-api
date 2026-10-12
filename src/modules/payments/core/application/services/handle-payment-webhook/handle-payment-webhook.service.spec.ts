import { Logger } from '@nestjs/common';
import { HandlePaymentWebhookService } from './handle-payment-webhook.service';
import {
  MockPaymentRepository,
  MockPaymentEventsScheduler,
  PaymentTestFactory,
  PaymentDtoTestFactory,
} from '../../../../testing';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { Payment } from '../../../domain/entities/payment';
import { ResultAssertionHelper, TEST_IDS } from '../../../../../../testing';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { ServiceError } from '../../../../../../shared-kernel/domain/exceptions/service-error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Result } from '../../../../../../shared-kernel/domain/result';

describe('HandlePaymentWebhookService', () => {
  let service: HandlePaymentWebhookService;
  let paymentRepository: MockPaymentRepository;
  let paymentEventsScheduler: MockPaymentEventsScheduler;

  const paymentIntentId = 'pi_test_12345';

  const givenPayment = (
    status: PaymentStatusType = PaymentStatusType.PENDING,
    overrides?: Parameters<typeof PaymentTestFactory.createDomainPayment>[0],
  ): Payment => {
    const payment = PaymentTestFactory.createDomainPayment({
      id: TEST_IDS.payment,
      orderId: TEST_IDS.order,
      amount: 5000,
      currency: 'USD',
      status,
      gatewayPaymentIntentId: paymentIntentId,
      ...overrides,
    });

    paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
      Result.success(payment),
    );

    return payment;
  };

  beforeEach(() => {
    paymentRepository = new MockPaymentRepository();
    paymentEventsScheduler = new MockPaymentEventsScheduler();
    service = new HandlePaymentWebhookService(
      paymentRepository,
      paymentEventsScheduler,
    );

    paymentRepository.update.mockImplementation((payment) =>
      Promise.resolve(Result.success(payment)),
    );
  });

  afterEach(() => {
    paymentRepository.reset();
    paymentEventsScheduler.reset();
  });

  describe('event scheduling reliability and retryable failures', () => {
    it('returns a retryable failure when emitPaymentCompleted fails after save, while update was called once', async () => {
      givenPayment(PaymentStatusType.PENDING);
      paymentEventsScheduler.mockFailedEmitPaymentCompleted(
        'Payment events queue down',
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment events queue down',
        InfrastructureError,
      );
      expect(result.error.retryable).toBe(true);
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledTimes(
        1,
      );
    });

    it('returns a retryable failure when emitPaymentFailed fails after save, while update was called once', async () => {
      givenPayment(PaymentStatusType.PENDING);
      paymentEventsScheduler.mockFailedEmitPaymentFailed(
        'Payment events queue down',
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Card expired',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment events queue down',
        InfrastructureError,
      );
      expect(result.error.retryable).toBe(true);
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledTimes(1);
    });

    it('emits nothing when repository save fails on payment succeeded', async () => {
      givenPayment(PaymentStatusType.PENDING);
      paymentRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Database failure'),
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Database failure');
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });

    it('emits nothing when repository save fails on payment failed', async () => {
      givenPayment(PaymentStatusType.PENDING);
      paymentRepository.update.mockResolvedValue(
        ErrorFactory.RepositoryError('Database failure'),
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Card expired',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Database failure');
      expect(paymentEventsScheduler.emitPaymentFailed).not.toHaveBeenCalled();
    });

    it('returns the repository failure unchanged when the lookup fails', async () => {
      const cause = new Error('Database connection failed');
      const repositoryFailure = ErrorFactory.RepositoryError(
        'Failed to find payment by gateway intent ID',
        cause,
      );
      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        repositoryFailure,
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find payment by gateway intent ID',
        RepositoryError,
        cause,
      );
      expect(result.error).toBe(repositoryFailure.error);
      expect(result.error.retryable).toBe(true);
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });
  });

  describe('idempotency and payment state transitions', () => {
    it('completes pending payment and emits completed event with metadata', async () => {
      givenPayment(PaymentStatusType.PENDING);

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
        metadata: {
          reservationId: '303',
          cartId: '404',
        },
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.COMPLETED,
      });
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledTimes(
        1,
      );
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledWith({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        transactionId: 'txn_100',
        reservationId: 303,
        cartId: 404,
      });
    });

    it('fails pending payment and emits failed event with reason and metadata', async () => {
      givenPayment(PaymentStatusType.PENDING);

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Card declined',
        metadata: {
          reservationId: '303',
        },
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.FAILED,
      });
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledWith({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        reason: 'Card declined',
        reservationId: 303,
      });
    });

    it('redelivered succeeded on COMPLETED returns success, no update, completed re-emitted once', async () => {
      givenPayment(PaymentStatusType.COMPLETED, {
        transactionId: 'txn_original',
      });

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_redelivered',
        metadata: {
          reservationId: '303',
          cartId: '404',
        },
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.COMPLETED,
      });
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledTimes(
        1,
      );
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledWith({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        transactionId: 'txn_redelivered',
        reservationId: 303,
        cartId: 404,
      });
    });

    it('redelivered failed on FAILED returns success and re-emits', async () => {
      givenPayment(PaymentStatusType.FAILED, {
        failureReason: 'Insufficient funds',
      });

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Insufficient funds',
        metadata: {
          reservationId: '303',
        },
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.FAILED,
      });
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledWith({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        reason: 'Insufficient funds',
        reservationId: 303,
      });
    });

    it('failed on COMPLETED logs a warning, returns success with no update and no emit', async () => {
      givenPayment(PaymentStatusType.COMPLETED);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Late failure arrival',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.COMPLETED,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Payment ${TEST_IDS.payment} received failed event but is in COMPLETED status. Ignoring.`,
        ),
      );
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(paymentEventsScheduler.emitPaymentFailed).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('failed on CANCELLED logs a warning, returns success with no update and no emit', async () => {
      givenPayment(PaymentStatusType.CANCELLED);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Late failure after cancellation',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.CANCELLED,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Payment ${TEST_IDS.payment} received failed event but is in CANCELLED status. Ignoring.`,
        ),
      );
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(paymentEventsScheduler.emitPaymentFailed).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('succeeded on FAILED returns failure', async () => {
      givenPayment(PaymentStatusType.FAILED);

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        ServiceError,
      );
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });

    it.todo('succeeded event for a FAILED payment, needs a product decision');

    it('succeeded on CANCELLED returns failure', async () => {
      givenPayment(PaymentStatusType.CANCELLED);

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        ServiceError,
      );
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });
  });

  describe('amount and currency validation', () => {
    it('amount mismatch is rejected with no update and no emit', async () => {
      givenPayment(PaymentStatusType.PENDING, { amount: 5000 });

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        amountMinor: 4000,
        currency: 'USD',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        ServiceError,
      );
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });

    it('currency mismatch is rejected with no update and no emit', async () => {
      givenPayment(PaymentStatusType.PENDING, { currency: 'USD' });

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        amountMinor: 5000,
        currency: 'EUR',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        undefined,
        ServiceError,
      );
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });

    it('matching amount and currency completes successfully', async () => {
      givenPayment(PaymentStatusType.PENDING);

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
        amountMinor: 5000,
        currency: 'usd',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.COMPLETED,
      });
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledTimes(
        1,
      );
    });

    it('completes successfully when amountMinor and currency are omitted', async () => {
      givenPayment(PaymentStatusType.PENDING);

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
      });
      const result = await service.execute(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
