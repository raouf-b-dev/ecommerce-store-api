import {
  PaymentTestFactory,
  RefundTestFactory,
} from 'src/modules/payments/testing';
import { PaymentStatusType } from '../value-objects/payment-status';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Payment', () => {
  describe('authorize and capture', () => {
    it('progresses pending payment through authorize to capture', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.PENDING,
      });

      ResultAssertionHelper.assertResultSuccess(payment.authorize('tx_abc123'));
      expect(payment.status).toBe(PaymentStatusType.AUTHORIZED);

      ResultAssertionHelper.assertResultSuccess(payment.capture());
      expect(payment.status).toBe(PaymentStatusType.CAPTURED);
      expect(payment.completedAt).not.toBeNull();
    });
  });

  describe('complete and fail', () => {
    it('completes pending payment', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.PENDING,
      });

      ResultAssertionHelper.assertResultSuccess(
        payment.complete('tx_done', 'visa-4242'),
      );

      expect(payment.status).toBe(PaymentStatusType.COMPLETED);
    });

    it('fails pending payment with reason', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.PENDING,
      });

      ResultAssertionHelper.assertResultSuccess(payment.fail('Card declined'));

      expect(payment.status).toBe(PaymentStatusType.FAILED);
      expect(payment.failureReason).toBe('Card declined');
    });
  });

  describe('setPaymentIntent', () => {
    it('stores gateway intent details on pending payment', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.PENDING,
      });

      ResultAssertionHelper.assertResultSuccess(
        payment.setPaymentIntent('pi_123', 'secret_abc'),
      );

      expect(payment.gatewayPaymentIntentId).toBe('pi_123');
      expect(payment.gatewayClientSecret).toBe('secret_abc');
    });

    it('rejects when payment is not pending', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.COMPLETED,
      });

      ResultAssertionHelper.assertResultFailure(
        payment.setPaymentIntent('pi_123', 'secret_abc'),
        'Can only set payment intent on pending payments',
        DomainError,
      );
    });
  });

  describe('cancel', () => {
    it('cancels authorized payment', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.AUTHORIZED,
        transactionId: 'tx_1',
      });

      ResultAssertionHelper.assertResultSuccess(payment.cancel());
      expect(payment.status).toBe(PaymentStatusType.CANCELLED);
    });
  });

  describe('addRefund', () => {
    it.each([PaymentStatusType.CAPTURED, PaymentStatusType.COMPLETED])(
      'allows refund when status is %s',
      (status) => {
        const payment = PaymentTestFactory.createDomainPayment({
          status,
          amount: 100,
          transactionId: 'tx_1',
          completedAt: new Date(),
        });
        const refund = RefundTestFactory.createDomainRefund({
          amount: 40,
          paymentId: payment.id!,
        });

        ResultAssertionHelper.assertResultSuccess(payment.addRefund(refund));

        expect(payment.refundedAmount).toBe(40);
        expect(payment.status).toBe(PaymentStatusType.PARTIALLY_REFUNDED);
      },
    );

    it.each([PaymentStatusType.PENDING, PaymentStatusType.FAILED])(
      'rejects refund when status is %s',
      (status) => {
        const payment = PaymentTestFactory.createDomainPayment({ status });
        const refund = RefundTestFactory.createDomainRefund({ amount: 10 });

        ResultAssertionHelper.assertResultFailure(
          payment.addRefund(refund),
          'Payment cannot be refunded in current status',
          DomainError,
        );
      },
    );

    it('marks payment as fully refunded when total matches amount', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.COMPLETED,
        amount: 100,
        transactionId: 'tx_1',
        completedAt: new Date(),
      });
      const refund = RefundTestFactory.createDomainRefund({
        amount: 100,
        paymentId: payment.id!,
      });

      ResultAssertionHelper.assertResultSuccess(payment.addRefund(refund));

      expect(payment.isFullyRefunded()).toBe(true);
      expect(payment.status).toBe(PaymentStatusType.REFUNDED);
    });

    it('rejects refund exceeding payment amount', () => {
      const payment = PaymentTestFactory.createDomainPayment({
        status: PaymentStatusType.COMPLETED,
        amount: 100,
        transactionId: 'tx_1',
        completedAt: new Date(),
      });
      const refund = RefundTestFactory.createDomainRefund({
        amount: 150,
        paymentId: payment.id!,
      });

      ResultAssertionHelper.assertResultFailure(
        payment.addRefund(refund),
        'Total refunded amount cannot exceed payment amount',
        DomainError,
      );
    });
  });
});
