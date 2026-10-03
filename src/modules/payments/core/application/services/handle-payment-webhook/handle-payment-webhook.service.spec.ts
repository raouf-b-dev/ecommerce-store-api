import { HandlePaymentWebhookService } from './handle-payment-webhook.service';
import {
  MockPaymentRepository,
  MockPaymentEventsScheduler,
  PaymentTestFactory,
  PaymentDtoTestFactory,
} from '../../../../testing';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { ResultAssertionHelper, TEST_IDS } from '../../../../../../testing';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ServiceError } from '../../../../../../shared-kernel/domain/exceptions/service-error';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';

describe('HandlePaymentWebhookService', () => {
  let service: HandlePaymentWebhookService;
  let paymentRepository: MockPaymentRepository;
  let paymentEventsScheduler: MockPaymentEventsScheduler;

  const paymentIntentId = 'pi_test_12345';

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

  describe('BUG 1: event loss and retryable failures', () => {
    it('returns a retryable failure when emitPaymentCompleted fails after save, while update was called once', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.PENDING,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );
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
      if (isFailure(result)) {
        expect(result.error.retryable).toBe(true);
      }
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledTimes(
        1,
      );
    });

    it('returns a retryable failure when emitPaymentFailed fails after save, while update was called once', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.PENDING,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );
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
      if (isFailure(result)) {
        expect(result.error.retryable).toBe(true);
      }
      expect(paymentRepository.update).toHaveBeenCalledTimes(1);
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('BUG 2: idempotency and state handling', () => {
    it('redelivered succeeded on COMPLETED returns success, no update, completed re-emitted once', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.COMPLETED,
        gatewayPaymentIntentId: paymentIntentId,
        transactionId: 'txn_original',
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_redelivered',
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
      expect(paymentEventsScheduler.emitPaymentCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: TEST_IDS.order,
          paymentId: TEST_IDS.payment,
        }),
      );
    });

    it('redelivered failed on FAILED returns success and re-emits', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.FAILED,
        gatewayPaymentIntentId: paymentIntentId,
        failureReason: 'Insufficient funds',
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.FAILED,
        failureReason: 'Insufficient funds',
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
      expect(paymentEventsScheduler.emitPaymentFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: TEST_IDS.order,
          paymentId: TEST_IDS.payment,
        }),
      );
    });

    it('failed on COMPLETED is ignored', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.COMPLETED,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

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
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(paymentEventsScheduler.emitPaymentFailed).not.toHaveBeenCalled();
      expect(
        paymentEventsScheduler.emitPaymentCompleted,
      ).not.toHaveBeenCalled();
    });

    it('succeeded on FAILED returns failure', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.FAILED,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

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

    it('succeeded on CANCELLED returns failure', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.CANCELLED,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

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

    it('amount mismatch is rejected with no update and no emit', async () => {
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50, // 5000 minor
        currency: 'USD',
        status: PaymentStatusType.PENDING,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

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
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.PENDING,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

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
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.PENDING,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

      const dto = PaymentDtoTestFactory.createPaymentWebhookDto({
        paymentIntentId,
        eventType: PaymentEventType.SUCCEEDED,
        transactionId: 'txn_100',
        amountMinor: 5000,
        currency: 'usd', // Case-insensitive comparison check
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
      const payment = PaymentTestFactory.createDomainPayment({
        id: TEST_IDS.payment,
        orderId: TEST_IDS.order,
        amount: 50,
        currency: 'USD',
        status: PaymentStatusType.PENDING,
        gatewayPaymentIntentId: paymentIntentId,
      });

      paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
        Result.success(payment),
      );

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
