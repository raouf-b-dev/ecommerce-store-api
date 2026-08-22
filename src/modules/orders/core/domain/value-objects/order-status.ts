import { OrderWorkflow } from '../policies/order-workflow';
import { OrderStatus } from './order-status.enum';

export { OrderStatus } from './order-status.enum';

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

  // Fulfillment phase checks
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

  // Terminal state checks
  isCancelled(): boolean {
    return this._status === OrderStatus.CANCELLED;
  }

  isRefunded(): boolean {
    return this._status === OrderStatus.REFUNDED;
  }

  // Composite checks
  isTerminal(): boolean {
    return OrderWorkflow.isTerminal(this._status);
  }

  isAwaitingPayment(): boolean {
    return [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_FAILED].includes(
      this._status,
    );
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
    return OrderWorkflow.canTransition(this._status, newStatus);
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
