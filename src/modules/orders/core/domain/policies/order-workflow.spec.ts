import { OrderStatus } from '../value-objects/order-status';
import { OrderWorkflow } from './order-workflow';

/**
 * Expected transition specification — intentionally independent from
 * production OrderWorkflow.TRANSITIONS. Tests assert production against
 * this matrix; do not derive expected values from OrderWorkflow.
 */
const allowedOrderWorkflowTransitions: [OrderStatus, OrderStatus][] = [
  [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED],
  [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING_PAYMENT],
  [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
  [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
  [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
  [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
];

const allStatuses = Object.values(OrderStatus);

const allowedSet = new Set(
  allowedOrderWorkflowTransitions.map(([from, to]) => `${from}->${to}`),
);

const forbiddenOrderWorkflowTransitions: [OrderStatus, OrderStatus][] =
  allStatuses.flatMap((from) =>
    allStatuses
      .filter((to) => from !== to && !allowedSet.has(`${from}->${to}`))
      .map((to) => [from, to] as [OrderStatus, OrderStatus]),
  );

const terminalOrderStatuses: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

const nonTerminalOrderStatuses: OrderStatus[] = allStatuses.filter(
  (status) => !terminalOrderStatuses.includes(status),
);

describe('OrderWorkflow', () => {
  describe('canTransition', () => {
    it.each(allowedOrderWorkflowTransitions)(
      'allows transition from %s to %s',
      (from, to) => {
        expect(OrderWorkflow.canTransition(from, to)).toBe(true);
      },
    );

    it.each(forbiddenOrderWorkflowTransitions)(
      'rejects transition from %s to %s',
      (from, to) => {
        expect(OrderWorkflow.canTransition(from, to)).toBe(false);
      },
    );
  });

  describe('ensureTransition', () => {
    it.each(allowedOrderWorkflowTransitions)(
      'does not throw for allowed transition from %s to %s',
      (from, to) => {
        expect(() => OrderWorkflow.ensureTransition(from, to)).not.toThrow();
      },
    );

    it('throws for forbidden transition', () => {
      expect(() =>
        OrderWorkflow.ensureTransition(
          OrderStatus.DELIVERED,
          OrderStatus.CONFIRMED,
        ),
      ).toThrow('Cannot transition from delivered to confirmed');
    });
  });

  describe('isTerminal', () => {
    it.each(terminalOrderStatuses)('%s is terminal', (status) => {
      expect(OrderWorkflow.isTerminal(status)).toBe(true);
    });

    it.each(nonTerminalOrderStatuses)('%s is not terminal', (status) => {
      expect(OrderWorkflow.isTerminal(status)).toBe(false);
    });
  });
});
