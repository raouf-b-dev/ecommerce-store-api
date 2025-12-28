// src/modules/orders/domain/entities/order.ts
import { IOrder } from '../interfaces/order.interface';
import { IOrderItem } from '../interfaces/order-item.interface';
import { OrderStatus, OrderStatusVO } from '../value-objects/order-status';
import { OrderItem, OrderItemProps } from './order-items';
import {
  ShippingAddress,
  ShippingAddressProps,
} from '../value-objects/shipping-address';
import { IShippingAddress } from '../interfaces/shipping-address.interface';
import { OrderPricing } from '../value-objects/order-pricing';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { DomainError } from '../../../../core/errors/domain.error';
import { Result } from '../../../../core/domain/result';
import { PaymentMethodType } from '../../../payments/domain';

export interface OrderProps {
  id: number | null;
  customerId: number;
  paymentId: number | null;
  paymentMethod: PaymentMethodType;
  shippingAddressId: number | null;
  items: OrderItemProps[];
  shippingAddress: ShippingAddressProps;
  customerNotes: string | null;
  status: string | OrderStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Order implements IOrder {
  private _id: number | null;
  private readonly _customerId: number;
  private _paymentId: number | null;
  private readonly _paymentMethod: PaymentMethodType;
  private _shippingAddressId: number | null;
  private _items: OrderItem[];
  private _shippingAddress: ShippingAddress;
  private _customerNotes: string | null;
  private _status: OrderStatusVO;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _pricing: OrderPricing;

  constructor(props: OrderProps) {
    this.validateProps(props);

    this._id = props.id || null;
    this._customerId = props.customerId;
    this._paymentId = props.paymentId || null;
    this._paymentMethod = props.paymentMethod;
    this._shippingAddressId = props.shippingAddressId || null;
    this._items = props.items.map((item) => new OrderItem(item));
    this._shippingAddress = ShippingAddress.fromPrimitives(
      props.shippingAddress,
    );
    this._customerNotes = props.customerNotes
      ? props.customerNotes.trim()
      : null;
    this._status = new OrderStatusVO(
      props.status || OrderStatus.PENDING_PAYMENT,
    );
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._pricing = OrderPricing.calculate(this._items);
  }

  private validateProps(props: OrderProps): Result<void, DomainError> {
    // ID can be null initially
    if (!props.customerId) {
      return ErrorFactory.DomainError('Customer ID is required');
    }
    if (!props.items || props.items.length === 0) {
      return ErrorFactory.DomainError('Order must have at least one item');
    }
    if (!props.shippingAddress) {
      return ErrorFactory.DomainError('Shipping address is required');
    }
    if (!props.paymentMethod) {
      return ErrorFactory.DomainError('Payment method is required');
    }

    return Result.success(undefined);
  }

  // Getters
  get id(): number | null {
    return this._id;
  }

  setId(id: number): void {
    this._id = id;
  }

  get customerId(): number {
    return this._customerId;
  }

  get paymentId(): number | null {
    return this._paymentId;
  }

  get paymentMethod(): PaymentMethodType {
    return this._paymentMethod;
  }

  get shippingAddressId(): number | null {
    return this._shippingAddressId;
  }

  get items(): IOrderItem[] {
    return this._items.map((item) => item.toPrimitives());
  }

  get shippingAddress(): IShippingAddress {
    return this._shippingAddress.toPrimitives();
  }

  get customerNotes(): string | null {
    return this._customerNotes;
  }

  get status(): OrderStatus {
    return this._status.value;
  }

  get subtotal(): number {
    return this._pricing.subtotal;
  }

  get shippingCost(): number {
    return this._pricing.shippingCost;
  }

  get totalPrice(): number {
    return this._pricing.totalPrice;
  }

  get currency(): string {
    return this._pricing.getTotalPriceMoney().currency;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  getPricing(): OrderPricing {
    return this._pricing;
  }

  // ==================== PAYMENT METHOD HELPERS ====================

  /**
   * Check if this order requires payment before confirmation (online payments)
   */
  requiresPaymentBeforeConfirmation(): boolean {
    return [
      PaymentMethodType.STRIPE,
      PaymentMethodType.PAYPAL,
      PaymentMethodType.CREDIT_CARD,
      PaymentMethodType.DEBIT_CARD,
      PaymentMethodType.BANK_TRANSFER,
    ].includes(this._paymentMethod);
  }

  /**
   * Check if this is a Cash on Delivery order
   */
  isCOD(): boolean {
    return this._paymentMethod === PaymentMethodType.CASH_ON_DELIVERY;
  }

  /**
   * Check if payment method requires a payment gateway
   */
  requiresPaymentGateway(): boolean {
    return [
      PaymentMethodType.STRIPE,
      PaymentMethodType.PAYPAL,
      PaymentMethodType.CREDIT_CARD,
      PaymentMethodType.DEBIT_CARD,
      PaymentMethodType.BANK_TRANSFER,
    ].includes(this._paymentMethod);
  }

  // ==================== PAYMENT ASSOCIATION ====================

  /**
   * Associate a payment with this order
   */
  associatePayment(paymentId: number): Result<void, DomainError> {
    if (!paymentId) {
      return ErrorFactory.DomainError('Payment ID is required');
    }
    this._paymentId = paymentId;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  hasPayment(): boolean {
    return this._paymentId !== null;
  }

  // ==================== BUSINESS RULES ====================

  private assertCanBeUpdated(): Result<void, DomainError> {
    if (!this._status.isPendingPayment() && !this._status.isPaymentFailed()) {
      return ErrorFactory.DomainError(
        'Order can only be updated when awaiting payment',
      );
    }
    return Result.success(undefined);
  }

  isPendingPayment(): boolean {
    return this._status.isPendingPayment();
  }

  confirmPayment(paymentId: number): Result<void, DomainError> {
    if (!this._status.isPendingPayment()) {
      return ErrorFactory.DomainError(
        'Payment can only be confirmed when order is pending payment',
      );
    }

    this._paymentId = paymentId;
    return this.changeStatus(OrderStatus.CONFIRMED);
  }

  markPaymentFailed(): Result<void, DomainError> {
    if (!this._status.isPendingPayment()) {
      return ErrorFactory.DomainError(
        'Can only mark payment as failed when pending payment',
      );
    }
    return this.changeStatus(OrderStatus.PAYMENT_FAILED);
  }

  retryPayment(): Result<void, DomainError> {
    if (!this._status.isPaymentFailed()) {
      return ErrorFactory.DomainError(
        'Can only retry payment when previous payment failed',
      );
    }
    return this.changeStatus(OrderStatus.PENDING_PAYMENT);
  }

  canBeConfirmed(): boolean {
    return (
      this.isCOD() ||
      this._status.isPendingPayment() ||
      this._status.isPendingConfirmation()
    );
  }

  confirm(): Result<void, DomainError> {
    if (!this.isCOD()) {
      return ErrorFactory.DomainError(
        'Online payment orders must use confirmPayment() after payment webhook',
      );
    }
    if (!this._status.isPendingConfirmation()) {
      return ErrorFactory.DomainError(
        'Only orders in pending confirmation can be confirmed manually',
      );
    }
    return this.changeStatus(OrderStatus.CONFIRMED);
  }

  canBeProcessed(): boolean {
    return this._status.isConfirmed();
  }

  process(): Result<void, DomainError> {
    if (!this.canBeProcessed()) {
      return ErrorFactory.DomainError(
        'Order must be confirmed before processing',
      );
    }
    return this.changeStatus(OrderStatus.PROCESSING);
  }

  canBeShipped(): boolean {
    return this._status.isProcessing();
  }

  ship(): Result<void, DomainError> {
    if (!this.canBeShipped()) {
      return ErrorFactory.DomainError(
        'Order must be in processing state to ship',
      );
    }
    return this.changeStatus(OrderStatus.SHIPPED);
  }

  canBeDelivered(): boolean {
    return this._status.isShipped();
  }

  deliver(): Result<void, DomainError> {
    if (!this.canBeDelivered()) {
      return ErrorFactory.DomainError(
        'Order cannot be delivered in current state',
      );
    }
    return this.changeStatus(OrderStatus.DELIVERED);
  }

  isCancellable(): boolean {
    return (
      this._status.isPendingPayment() ||
      this._status.isPendingConfirmation() ||
      this._status.isPaymentFailed() ||
      this._status.isConfirmed() ||
      this._status.isProcessing() ||
      this._status.isShipped()
    );
  }

  cancel(reason?: string): Result<void, DomainError> {
    if (!this.isCancellable()) {
      return ErrorFactory.DomainError(
        'Order cannot be cancelled in current state',
      );
    }

    if (reason) {
      this._customerNotes = this._customerNotes
        ? `${this._customerNotes}\n\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }

    return this.changeStatus(OrderStatus.CANCELLED);
  }

  refund(reason?: string): Result<void, DomainError> {
    if (!this._status.isDelivered()) {
      return ErrorFactory.DomainError('Only delivered orders can be refunded');
    }

    if (reason) {
      this._customerNotes = this._customerNotes
        ? `${this._customerNotes}\n\nRefund reason: ${reason}`
        : `Refund reason: ${reason}`;
    }

    return this.changeStatus(OrderStatus.REFUNDED);
  }

  getNextExpectedAction(): string {
    if (this._status.isPendingPayment()) {
      return 'Awaiting payment confirmation';
    }

    if (this._status.isPendingConfirmation()) {
      return 'Awaiting manual confirmation';
    }

    if (this._status.isPaymentFailed()) {
      return 'Payment failed - awaiting retry or cancellation';
    }

    if (this._status.isConfirmed()) {
      return 'Ready for processing';
    }

    if (this._status.isProcessing()) {
      return 'Ready for shipping';
    }

    if (this._status.isShipped()) {
      if (this.isCOD()) {
        return 'Awaiting delivery and payment collection';
      }
      return 'In transit';
    }

    if (this._status.isDelivered()) {
      return 'Completed';
    }

    if (this._status.isRefunded()) {
      return 'Refunded';
    }

    return 'Cancelled';
  }

  // ==================== UPDATE METHODS ====================

  private recalculatePricing(): void {
    this._pricing = OrderPricing.recalculate(this._items);
  }

  updateItems(items: OrderItemProps[]): Result<void, DomainError> {
    const canUpdate = this.assertCanBeUpdated();
    if (canUpdate.isFailure) return canUpdate;

    if (!items || items.length === 0) {
      return ErrorFactory.DomainError('Order must have at least one item');
    }
    this._items = items.map((item) => new OrderItem(item));
    this.recalculatePricing();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  updateShippingAddress(address: IShippingAddress): Result<void, DomainError> {
    const canUpdate = this.assertCanBeUpdated();
    if (canUpdate.isFailure) return canUpdate;

    this._shippingAddress = ShippingAddress.fromPrimitives(address);
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updateCustomerNotes(notes?: string): Result<void, DomainError> {
    const canUpdate = this.assertCanBeUpdated();
    if (canUpdate.isFailure) return canUpdate;

    this._customerNotes = notes ? notes.trim() : null;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  private changeStatus(
    newStatus: OrderStatus | string,
  ): Result<void, DomainError> {
    const newStatusVO = new OrderStatusVO(newStatus);

    if (!this._status.canTransitionTo(newStatusVO.value)) {
      return ErrorFactory.DomainError(
        `Cannot transition from ${this._status.value} to ${newStatusVO.value}`,
      );
    }

    this._status = newStatusVO;
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  // ==================== QUERY METHODS ====================

  isEditable(): boolean {
    return this._status.isPendingPayment() || this._status.isPaymentFailed();
  }

  isInProgress(): boolean {
    return (
      this._status.isConfirmed() ||
      this._status.isProcessing() ||
      this._status.isShipped()
    );
  }

  isCompleted(): boolean {
    return this._status.isDelivered();
  }

  isCancelled(): boolean {
    return this._status.isCancelled();
  }

  // ==================== SERIALIZATION ====================

  getItems(): OrderItem[] {
    return this._items;
  }

  toPrimitives(): IOrder {
    return {
      id: this._id,
      customerId: this._customerId,
      paymentId: this._paymentId,
      paymentMethod: this._paymentMethod,
      shippingAddressId: this._shippingAddressId,
      items: this.items,
      shippingAddress: this.shippingAddress,
      customerNotes: this._customerNotes,
      subtotal: this.subtotal,
      shippingCost: this.shippingCost,
      totalPrice: this.totalPrice,
      currency: this._pricing.getTotalPriceMoney().currency,
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: OrderProps): Order {
    return new Order(data);
  }

  static create(props: {
    id: number | null;
    customerId: number;
    paymentMethod: PaymentMethodType;
    items: OrderItemProps[];
    shippingAddress: ShippingAddressProps;
    customerNotes: string | null;
  }): Order {
    const isCOD = props.paymentMethod === PaymentMethodType.CASH_ON_DELIVERY;

    return new Order({
      id: props.id,
      customerId: props.customerId,
      paymentId: null,
      paymentMethod: props.paymentMethod,
      shippingAddressId: props.shippingAddress.id,
      items: props.items,
      shippingAddress: props.shippingAddress,
      customerNotes: props.customerNotes,
      status: isCOD
        ? OrderStatus.PENDING_CONFIRMATION
        : OrderStatus.PENDING_PAYMENT,
      createdAt: null,
      updatedAt: null,
    });
  }

  static createForCOD(props: {
    id: number | null;
    customerId: number;
    items: OrderItemProps[];
    shippingAddress: ShippingAddressProps;
    customerNotes: string | null;
  }): Order {
    return new Order({
      id: props.id,
      customerId: props.customerId,
      paymentId: null,
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      shippingAddressId: props.shippingAddress.id,
      items: props.items,
      shippingAddress: props.shippingAddress,
      customerNotes: props.customerNotes,
      status: OrderStatus.PENDING_CONFIRMATION,
      createdAt: null,
      updatedAt: null,
    });
  }
}
