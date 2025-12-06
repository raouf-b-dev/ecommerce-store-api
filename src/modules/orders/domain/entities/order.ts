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
  id: string;
  customerId: string;
  paymentId: string | null;
  paymentMethod: PaymentMethodType;
  shippingAddressId: string;
  items: OrderItemProps[];
  shippingAddress: ShippingAddressProps;
  customerNotes: string | null;
  status: string | OrderStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Order implements IOrder {
  private readonly _id: string;
  private readonly _customerId: string;
  private _paymentId: string | null;
  private readonly _paymentMethod: PaymentMethodType;
  private readonly _shippingAddressId: string;
  private _items: OrderItem[];
  private _shippingAddress: ShippingAddress;
  private _customerNotes: string | null;
  private _status: OrderStatusVO;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _pricing: OrderPricing;

  constructor(props: OrderProps) {
    this.validateProps(props);

    this._id = props.id.trim();
    this._customerId = props.customerId.trim();
    this._paymentId = props.paymentId?.trim() || null;
    this._paymentMethod = props.paymentMethod;
    this._shippingAddressId = props.shippingAddressId.trim();
    this._items = props.items.map((item) => new OrderItem(item));
    this._shippingAddress = ShippingAddress.fromPrimitives(
      props.shippingAddress,
    );
    this._customerNotes = props.customerNotes
      ? props.customerNotes.trim()
      : null;
    this._status = new OrderStatusVO(props.status || OrderStatus.PENDING);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._pricing = OrderPricing.calculate(this._items);
  }

  private validateProps(props: OrderProps): Result<void, DomainError> {
    if (!props.id?.trim()) {
      return ErrorFactory.DomainError('Order ID is required');
    }
    if (!props.customerId?.trim()) {
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
  get id(): string {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  get paymentId(): string | null {
    return this._paymentId;
  }

  get paymentMethod(): PaymentMethodType {
    return this._paymentMethod;
  }

  get shippingAddressId(): string {
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
  associatePayment(paymentId: string): Result<void, DomainError> {
    if (!paymentId?.trim()) {
      return ErrorFactory.DomainError('Payment ID is required');
    }
    this._paymentId = paymentId.trim();
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  hasPayment(): boolean {
    return this._paymentId !== null;
  }

  // ==================== BUSINESS RULES ====================

  private assertCanBeUpdated(): Result<void, DomainError> {
    if (!this._status.isPending()) {
      return ErrorFactory.DomainError(
        'Order can only be updated when status is PENDING',
      );
    }
    return Result.success(undefined);
  }

  /**
   * Check if order can be confirmed.
   * Note: For orders requiring payment before confirmation,
   * the use case must verify payment status via PaymentsModule.
   */
  canBeConfirmed(): boolean {
    return this._status.isPending();
  }

  confirm(): Result<void, DomainError> {
    if (!this.canBeConfirmed()) {
      return ErrorFactory.DomainError(
        'Order cannot be confirmed in current state',
      );
    }

    if (this.requiresPaymentBeforeConfirmation() && !this.hasPayment()) {
      return ErrorFactory.DomainError(
        'Cannot confirm order - payment must be completed first',
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

  /**
   * Mark order as delivered.
   * Note: For COD orders, the use case must record payment via PaymentsModule.
   */
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
      this._status.isPending() ||
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

  getNextExpectedAction(): string {
    if (this._status.isPending()) {
      if (this.requiresPaymentBeforeConfirmation() && !this._paymentId) {
        return 'Awaiting payment';
      }
      return 'Awaiting confirmation';
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
    return this._status.isPending();
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
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: OrderProps): Order {
    return new Order(data);
  }

  static create(props: {
    id: string;
    customerId: string;
    paymentMethod: PaymentMethodType;
    items: OrderItemProps[];
    shippingAddress: ShippingAddressProps;
    customerNotes: string | null;
  }): Order {
    return new Order({
      id: props.id,
      customerId: props.customerId,
      paymentId: null, // Payment created separately
      paymentMethod: props.paymentMethod,
      shippingAddressId: props.shippingAddress.id,
      items: props.items,
      shippingAddress: props.shippingAddress,
      customerNotes: props.customerNotes,
      status: OrderStatus.PENDING,
      createdAt: null,
      updatedAt: null,
    });
  }
}
