// src/modules/orders/domain/value-objects/order-status.ts

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
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

  isConfirmed(): boolean {
    return this._status === OrderStatus.CONFIRMED;
  }

  isProcessing(): boolean {
    return this._status === OrderStatus.PROCESSING;
  }

  isShipped(): boolean {
    return this._status === OrderStatus.SHIPPED;
  }

  isDelivered(): boolean {
    return this._status === OrderStatus.DELIVERED;
  }

  isCancelled(): boolean {
    return this._status === OrderStatus.CANCELLED;
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
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

  static confirmed(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.CONFIRMED);
  }

  static processing(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.PROCESSING);
  }

  static shipped(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.SHIPPED);
  }

  static delivered(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.DELIVERED);
  }

  static cancelled(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.CANCELLED);
  }
}
