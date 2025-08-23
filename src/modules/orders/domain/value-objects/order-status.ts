// src/modules/orders/domain/value-objects/order-status.ts
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  CANCELLED = 'cancelled',
}

export class OrderStatusVO {
  private readonly _status: OrderStatus;

  constructor(status: string | OrderStatus) {
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new Error(`Invalid order status: ${status}`);
    }
    this._status = status as OrderStatus;
  }

  get value(): OrderStatus {
    return this._status;
  }

  isPending(): boolean {
    return this._status === OrderStatus.PENDING;
  }

  isPaid(): boolean {
    return this._status === OrderStatus.PAID;
  }

  isShipped(): boolean {
    return this._status === OrderStatus.SHIPPED;
  }

  isCancelled(): boolean {
    return this._status === OrderStatus.CANCELLED;
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [], // Final state
      [OrderStatus.CANCELLED]: [], // Final state
    };

    return transitions[this._status].includes(newStatus);
  }

  equals(other: OrderStatusVO): boolean {
    return this._status === other._status;
  }

  toString(): string {
    return this._status;
  }

  static pending(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.PENDING);
  }

  static paid(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.PAID);
  }

  static shipped(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.SHIPPED);
  }

  static cancelled(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.CANCELLED);
  }
}
