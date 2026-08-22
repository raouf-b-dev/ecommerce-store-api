import { OrderStatus, OrderStatusVO } from './order-status';

describe('OrderStatusVO', () => {
  describe('construction', () => {
    it('throws when status string is invalid', () => {
      expect(() => new OrderStatusVO('invalid_status')).toThrow(
        'Invalid order status: invalid_status',
      );
    });

    it.each(Object.values(OrderStatus))('accepts valid status %s', (status) => {
      expect(new OrderStatusVO(status).value).toBe(status);
    });
  });

  describe('static factories', () => {
    it.each([
      ['pendingPayment', OrderStatus.PENDING_PAYMENT],
      ['paymentFailed', OrderStatus.PAYMENT_FAILED],
      ['confirmed', OrderStatus.CONFIRMED],
      ['processing', OrderStatus.PROCESSING],
      ['shipped', OrderStatus.SHIPPED],
      ['delivered', OrderStatus.DELIVERED],
      ['cancelled', OrderStatus.CANCELLED],
      ['refunded', OrderStatus.REFUNDED],
    ] as const)('%s returns %s', (factory, expected) => {
      expect(OrderStatusVO[factory]().value).toBe(expected);
    });
  });

  describe('predicate helpers', () => {
    it('isAwaitingPayment is true for payment phase statuses', () => {
      expect(OrderStatusVO.pendingPayment().isAwaitingPayment()).toBe(true);
      expect(OrderStatusVO.paymentFailed().isAwaitingPayment()).toBe(true);
      expect(OrderStatusVO.confirmed().isAwaitingPayment()).toBe(false);
    });

    it('isTerminal delegates to OrderWorkflow (cancelled and refunded only)', () => {
      expect(OrderStatusVO.delivered().isTerminal()).toBe(false);
      expect(OrderStatusVO.cancelled().isTerminal()).toBe(true);
      expect(OrderStatusVO.refunded().isTerminal()).toBe(true);
      expect(OrderStatusVO.confirmed().isTerminal()).toBe(false);
    });
  });

  describe('equals and toString', () => {
    it('equals compares status value', () => {
      const a = OrderStatusVO.confirmed();
      const b = OrderStatusVO.confirmed();
      const c = OrderStatusVO.processing();

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('toString returns enum value', () => {
      expect(OrderStatusVO.shipped().toString()).toBe(OrderStatus.SHIPPED);
    });
  });
});
