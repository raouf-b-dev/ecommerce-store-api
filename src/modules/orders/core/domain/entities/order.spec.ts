import { Order } from './order';
import { OrderStatus } from '../value-objects/order-status';
import { ResultAssertionHelper } from '../../../../../testing';
import { OrderTestFactory } from 'src/modules/orders/testing';
import { DomainError } from 'src/shared-kernel/domain/exceptions/domain.error';

describe('Order', () => {
  describe('confirmPayment', () => {
    describe('when order is PENDING_PAYMENT', () => {
      it('transitions order to CONFIRMED and associates payment', () => {
        const order = OrderTestFactory.createDomainOrder({
          status: OrderStatus.PENDING_PAYMENT,
        });

        const result = order.confirmPayment(42);

        ResultAssertionHelper.assertResultSuccess(result);
        expect(order.status).toBe(OrderStatus.CONFIRMED);
        expect(order.paymentId).toBe(42);
      });
    });

    describe('when order is already CONFIRMED', () => {
      it('returns failure without changing status', () => {
        const order = OrderTestFactory.createDomainOrder({
          status: OrderStatus.CONFIRMED,
          paymentId: 1,
        });

        const result = order.confirmPayment(99);

        ResultAssertionHelper.assertResultFailure(
          result,
          'Payment can only be confirmed when order is pending payment',
          DomainError,
        );
        expect(order.status).toBe(OrderStatus.CONFIRMED);
        expect(order.paymentId).toBe(1);
      });
    });
  });

  describe('payment failure and retry', () => {
    it('marks pending order as payment failed then retries', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.PENDING_PAYMENT,
      });

      ResultAssertionHelper.assertResultSuccess(order.markPaymentFailed());
      expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);

      ResultAssertionHelper.assertResultSuccess(order.retryPayment());
      expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    });
  });

  describe('fulfillment lifecycle', () => {
    it('progresses confirmed order through processing, shipped, delivered', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CONFIRMED,
        paymentId: 1,
      });

      ResultAssertionHelper.assertResultSuccess(order.process());
      expect(order.status).toBe(OrderStatus.PROCESSING);

      ResultAssertionHelper.assertResultSuccess(order.ship());
      expect(order.status).toBe(OrderStatus.SHIPPED);

      ResultAssertionHelper.assertResultSuccess(order.deliver());
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    describe('when order is DELIVERED', () => {
      it('transitions to REFUNDED via refund()', () => {
        const order = OrderTestFactory.createDomainOrder({
          status: OrderStatus.DELIVERED,
          paymentId: 1,
        });

        ResultAssertionHelper.assertResultSuccess(
          order.refund('Customer return'),
        );
        expect(order.status).toBe(OrderStatus.REFUNDED);
        expect(order.userNotes).toContain('Customer return');
      });
    });
  });

  describe('isCancellable', () => {
    it.each([
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
    ])('is true when status is %s', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: status === OrderStatus.PENDING_PAYMENT ? null : 1,
      });

      expect(order.isCancellable()).toBe(true);
    });

    it.each([
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
      OrderStatus.CANCELLED,
    ])('is false when status is %s', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: 1,
      });

      expect(order.isCancellable()).toBe(false);
    });
  });

  describe('isFulfilmentStarted', () => {
    it.each([
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
    ])('is true when status is %s', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: 1,
      });

      expect(order.isFulfilmentStarted()).toBe(true);
    });

    it.each([
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED,
    ])('is false when status is %s', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: status === OrderStatus.PENDING_PAYMENT ? null : 1,
      });

      expect(order.isFulfilmentStarted()).toBe(false);
    });
  });

  describe('cancel', () => {
    it.each([
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
    ])('allows cancellation when status is %s', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: status === OrderStatus.PENDING_PAYMENT ? null : 1,
      });

      const result = order.cancel('Test reason');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it.each([
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
      OrderStatus.CANCELLED,
    ])('rejects cancellation when status is %s', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: 1,
      });

      const result = order.cancel();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order cannot be cancelled in current state',
        DomainError,
      );
      expect(result).toMatchObject({
        isFailure: true,
        error: { statusCode: 409 },
      });
    });
  });

  describe('edit guards', () => {
    const updatedItems = [
      {
        id: 1,
        productId: 1,
        productName: 'Updated',
        quantity: 2,
        unitPrice: 15,
        currency: 'USD',
      },
    ];

    it.each([OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_FAILED])(
      'allows updates when status is %s',
      (status) => {
        const order = OrderTestFactory.createDomainOrder({ status });

        ResultAssertionHelper.assertResultSuccess(
          order.updateItems(updatedItems),
        );
        ResultAssertionHelper.assertResultSuccess(
          order.updateCustomerNotes('New notes'),
        );
      },
    );

    it.each([OrderStatus.CONFIRMED, OrderStatus.PROCESSING])(
      'rejects updates when status is %s',
      (status) => {
        const order = OrderTestFactory.createDomainOrder({
          status,
          paymentId: 1,
        });

        const result = order.updateItems(updatedItems);

        ResultAssertionHelper.assertResultFailure(
          result,
          'Order can only be updated when awaiting payment',
          DomainError,
        );
      },
    );
  });

  describe('associatePayment', () => {
    it('associates payment id when valid', () => {
      const order = OrderTestFactory.createDomainOrder();

      ResultAssertionHelper.assertResultSuccess(order.associatePayment(5));

      expect(order.hasPayment()).toBe(true);
      expect(order.paymentId).toBe(5);
    });

    it('rejects missing payment id', () => {
      const order = OrderTestFactory.createDomainOrder();

      ResultAssertionHelper.assertResultFailure(
        order.associatePayment(0),
        'Payment ID is required',
        DomainError,
      );
    });
  });

  describe('classifyIncomingPayment', () => {
    it('returns confirm when status is PENDING_PAYMENT', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: null,
      });

      expect(order.classifyIncomingPayment(42)).toEqual({ action: 'confirm' });
    });

    it('returns record-late when CANCELLED with no payment recorded', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });

      expect(order.classifyIncomingPayment(42)).toEqual({
        action: 'record-late',
      });
    });

    it('returns record-late when CANCELLED with the same paymentId', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: 42,
      });

      expect(order.classifyIncomingPayment(42)).toEqual({
        action: 'record-late',
      });
    });

    it('returns surplus when CANCELLED with a different paymentId', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: 42,
      });

      expect(order.classifyIncomingPayment(99)).toEqual({ action: 'surplus' });
    });

    it('returns surplus when status is PAYMENT_FAILED for any paymentId', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.PAYMENT_FAILED,
        paymentId: null,
      });

      expect(order.classifyIncomingPayment(42)).toEqual({ action: 'surplus' });
    });

    it.each([
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
    ])('returns already-applied when %s and paymentId matches', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: 42,
      });

      expect(order.classifyIncomingPayment(42)).toEqual({
        action: 'already-applied',
      });
    });

    it.each([
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
    ])('returns surplus when %s and paymentId differs', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: 42,
      });

      expect(order.classifyIncomingPayment(99)).toEqual({
        action: 'surplus',
      });
    });

    it.each([
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
    ])('returns unknown when %s and paymentId is null', (status) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: null,
      });

      expect(order.classifyIncomingPayment(42)).toEqual({
        action: 'unknown',
      });
    });
  });

  describe('recordPaymentAfterCancellation', () => {
    it('sets paymentId and keeps CANCELLED when status is CANCELLED', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });

      const result = order.recordPaymentAfterCancellation(42);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.paymentId).toBe(42);
    });

    it('is idempotent for the same paymentId', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: 42,
      });

      const result = order.recordPaymentAfterCancellation(42);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.paymentId).toBe(42);
    });

    it('rejects a different paymentId when one is already recorded', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: 42,
      });

      const result = order.recordPaymentAfterCancellation(99);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Order already has a different payment recorded',
        DomainError,
      );
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.paymentId).toBe(42);
    });

    it('rejects when status is not CANCELLED', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.PENDING_PAYMENT,
        paymentId: null,
      });

      const result = order.recordPaymentAfterCancellation(42);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment after cancellation can only be recorded when the order is cancelled',
        DomainError,
      );
      expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(order.paymentId).toBeNull();
    });

    it('rejects a missing payment id', () => {
      const order = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CANCELLED,
        paymentId: null,
      });

      const result = order.recordPaymentAfterCancellation(0);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment ID is required',
        DomainError,
      );
      expect(order.paymentId).toBeNull();
    });
  });

  describe('getNextExpectedAction', () => {
    it.each([
      [OrderStatus.PENDING_PAYMENT, 'Awaiting payment confirmation'],
      [
        OrderStatus.PAYMENT_FAILED,
        'Payment failed - awaiting retry or cancellation',
      ],
      [OrderStatus.CONFIRMED, 'Ready for processing'],
      [OrderStatus.PROCESSING, 'Ready for shipping'],
      [OrderStatus.SHIPPED, 'In transit'],
      [OrderStatus.DELIVERED, 'Completed'],
      [OrderStatus.REFUNDED, 'Refunded'],
      [OrderStatus.CANCELLED, 'Cancelled'],
    ] as const)('returns action hint for %s', (status, expected) => {
      const order = OrderTestFactory.createDomainOrder({
        status,
        paymentId: status === OrderStatus.PENDING_PAYMENT ? null : 1,
      });

      expect(order.getNextExpectedAction()).toBe(expected);
    });
  });

  describe('serialization', () => {
    it('round-trips through toPrimitives and fromPrimitives', () => {
      const original = OrderTestFactory.createDomainOrder({
        status: OrderStatus.CONFIRMED,
        paymentId: 1,
      });

      const restored = Order.fromPrimitives(original.toPrimitives());

      expect(restored.id).toBe(original.id);
      expect(restored.userId).toBe(original.userId);
      expect(restored.status).toBe(original.status);
      expect(restored.totalPrice).toBe(original.totalPrice);
    });
  });
});
