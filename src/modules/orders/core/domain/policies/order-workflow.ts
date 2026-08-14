import { OrderStatus } from '../value-objects/order-status.enum';

export class OrderWorkflow {
  private static readonly TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING_PAYMENT]: [
      OrderStatus.CONFIRMED,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAYMENT_FAILED]: [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
  };

  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.TRANSITIONS[from].includes(to);
  }

  static ensureTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Cannot transition from ${from} to ${to}`);
    }
  }

  static isTerminal(status: OrderStatus): boolean {
    return status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED;
  }
}
