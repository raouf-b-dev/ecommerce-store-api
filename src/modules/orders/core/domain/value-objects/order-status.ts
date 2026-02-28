// src/modules/orders/domain/value-objects/order-status.ts
export enum OrderStatus {
  // Payment Phase (online payments only)
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_FAILED = 'payment_failed',

  // Confirmation Phase
  PENDING_CONFIRMATION = 'pending_confirmation',
  CONFIRMED = 'confirmed',

  // Fulfillment Phase
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',

  // Terminal States
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
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

  // Payment phase checks
  isPendingPayment(): boolean {
    return this._status === OrderStatus.PENDING_PAYMENT;
  }

  isPaymentFailed(): boolean {
    return this._status === OrderStatus.PAYMENT_FAILED;
  }

  // Confirmation phase checks
  isPendingConfirmation(): boolean {
    return this._status === OrderStatus.PENDING_CONFIRMATION;
  }

  isConfirmed(): boolean {
    return this._status === OrderStatus.CONFIRMED;
  }

  // Fulfillment phase checks
  isProcessing(): boolean {
    return this._status === OrderStatus.PROCESSING;
  }

  isShipped(): boolean {
    return this._status === OrderStatus.SHIPPED;
  }

  isDelivered(): boolean {
    return this._status === OrderStatus.DELIVERED;
  }

  // Terminal state checks
  isCancelled(): boolean {
    return this._status === OrderStatus.CANCELLED;
  }

  isRefunded(): boolean {
    return this._status === OrderStatus.REFUNDED;
  }

  // Composite checks
  isTerminal(): boolean {
    return [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
    ].includes(this._status);
  }

  isAwaitingPayment(): boolean {
    return [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_FAILED].includes(
      this._status,
    );
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      // Payment phase transitions
      [OrderStatus.PENDING_PAYMENT]: [
        OrderStatus.CONFIRMED, // Payment success
        OrderStatus.PAYMENT_FAILED, // Payment failed
        OrderStatus.CANCELLED, // Timeout or user cancel
      ],
      [OrderStatus.PAYMENT_FAILED]: [
        OrderStatus.PENDING_PAYMENT, // Retry payment
        OrderStatus.CANCELLED, // Abandon
      ],

      // Confirmation phase transitions
      [OrderStatus.PENDING_CONFIRMATION]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED, // Cancel before processing
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED, // Cancel during processing (with refund if paid)
      ],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED, // Failed delivery / return
      ],
      [OrderStatus.DELIVERED]: [
        OrderStatus.REFUNDED, // Return and refund
      ],

      // Terminal states - no transitions allowed
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    return transitions[this._status].includes(newStatus);
  }

  equals(other: OrderStatusVO): boolean {
    return this._status === other._status;
  }

  toString(): string {
    return this._status;
  }

  // Static factory methods
  static pendingPayment(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.PENDING_PAYMENT);
  }

  static paymentFailed(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.PAYMENT_FAILED);
  }

  static pendingConfirmation(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.PENDING_CONFIRMATION);
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

  static refunded(): OrderStatusVO {
    return new OrderStatusVO(OrderStatus.REFUNDED);
  }
}
