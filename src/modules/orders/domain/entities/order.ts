// src/modules/orders/domain/entities/order.entity.ts
import { IOrder } from '../interfaces/order.interface';
import { IOrderItem } from '../interfaces/order-item.interface';
import { OrderStatus, OrderStatusVO } from '../value-objects/order-status';
import { OrderItem, OrderItemProps } from './order-items';
import {
  CustomerInfo,
  CustomerInfoProps,
} from '../value-objects/customer-info';
import {
  ShippingAddress,
  ShippingAddressProps,
} from '../value-objects/shipping-address';
import { PaymentInfo, PaymentInfoProps } from '../value-objects/payment-info';
import {
  ICustomerInfo,
  ICustomerInfoEditable,
} from '../interfaces/customer-info.interface';
import {
  IPaymentInfo,
  IPaymentInfoEditable,
} from '../interfaces/payment-info.interface';
import {
  PaymentStatus,
  PaymentStatusVO,
} from '../value-objects/payment-status';
import { PaymentMethodVO } from '../value-objects/payment-method';
import { OrderPricing } from '../value-objects/order-pricing';
import { IShippingAddress } from '../interfaces/shipping-address.interface';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { DomainError } from '../../../../core/errors/domain.error';
import { Result } from '../../../../core/domain/result';

export interface OrderProps {
  id: string;
  customerId: string;
  paymentInfoId: string;
  shippingAddressId: string;
  customerInfo: CustomerInfoProps;
  items: OrderItemProps[];
  shippingAddress: ShippingAddressProps;
  paymentInfo: PaymentInfoProps;
  customerNotes: string | null;
  status: string | OrderStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Order implements IOrder {
  private readonly _id: string;
  private readonly _customerId: string;
  private readonly _paymentInfoId: string;
  private readonly _shippingAddressId: string;
  private _customerInfo: CustomerInfo;
  private _items: OrderItem[];
  private _shippingAddress: ShippingAddress;
  private _paymentInfo: PaymentInfo;
  private _customerNotes: string | null;
  private _status: OrderStatusVO;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _pricing: OrderPricing;

  constructor(props: OrderProps) {
    this.validateProps(props);

    this._id = props.id.trim();
    this._customerId = props.customerId.trim();
    this._paymentInfoId = props.paymentInfoId.trim();
    this._shippingAddressId = props.shippingAddressId.trim();
    this._customerInfo = CustomerInfo.fromPrimitives(props.customerInfo);
    this._items = props.items.map((item) => new OrderItem(item));
    this._shippingAddress = ShippingAddress.fromPrimitives(
      props.shippingAddress,
    );
    this._paymentInfo = PaymentInfo.fromPrimitives(props.paymentInfo);
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
    if (!props.customerInfo) {
      return ErrorFactory.DomainError('Customer information is required');
    }
    if (!props.items || props.items.length === 0) {
      return ErrorFactory.DomainError('Order must have at least one item');
    }
    if (!props.shippingAddress) {
      return ErrorFactory.DomainError('Shipping address is required');
    }
    if (!props.paymentInfo) {
      return ErrorFactory.DomainError('Payment information is required');
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
  get paymentInfoId(): string {
    return this._paymentInfoId;
  }
  get shippingAddressId(): string {
    return this._shippingAddressId;
  }
  get customerInfo(): ICustomerInfo {
    return this._customerInfo.toPrimitives();
  }
  get items(): IOrderItem[] {
    return this._items.map((item) => item.toPrimitives());
  }
  get shippingAddress(): IShippingAddress {
    return this._shippingAddress.toPrimitives();
  }
  get paymentInfo(): IPaymentInfo {
    return {
      id: this._paymentInfo.id,
      method: this._paymentInfo.method,
      status: this._paymentInfo.status,
      amount: this._paymentInfo.amount,
      transactionId: this._paymentInfo.transactionId,
      paidAt: this._paymentInfo.paidAt,
      notes: this._paymentInfo.notes,
    };
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

  private getPaymentMethod(): PaymentMethodVO {
    return new PaymentMethodVO(this._paymentInfo.method);
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

  canBeConfirmed(): boolean {
    if (!this._status.isPending()) {
      return false;
    }

    const paymentMethod = this.getPaymentMethod();

    if (paymentMethod.requiresPaymentBeforeConfirmation()) {
      return this._paymentInfo.isCompleted();
    }

    return true;
  }

  confirm(): Result<void, DomainError> {
    if (!this.canBeConfirmed()) {
      const paymentMethod = this.getPaymentMethod();

      if (paymentMethod.requiresPaymentBeforeConfirmation()) {
        return ErrorFactory.DomainError(
          'Cannot confirm order - payment must be completed first',
        );
      }

      return ErrorFactory.DomainError(
        'Order cannot be confirmed in current state',
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
    if (!this._status.isShipped()) {
      return false;
    }

    const paymentMethod = this.getPaymentMethod();

    if (paymentMethod.requiresPaymentOnDelivery()) {
      return (
        this._paymentInfo.isPending() || this._paymentInfo.isNotRequiredYet()
      );
    }

    return this._paymentInfo.isCompleted();
  }

  deliver(codPaymentDetails?: {
    transactionId?: string;
    notes?: string;
  }): Result<void, DomainError> {
    if (!this.canBeDelivered()) {
      return ErrorFactory.DomainError(
        'Order cannot be delivered in current state',
      );
    }

    const paymentMethod = this.getPaymentMethod();

    if (paymentMethod.requiresPaymentOnDelivery()) {
      if (!this._paymentInfo.isCompleted()) {
        this._paymentInfo.markAsCompleted(
          codPaymentDetails?.transactionId || `COD-${this._id}`,
          codPaymentDetails?.notes || 'Payment collected on delivery',
        );
      }
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

    const changeStatusResult = this.changeStatus(OrderStatus.CANCELLED);
    if (changeStatusResult.isFailure) return changeStatusResult;

    const paymentMethod = this.getPaymentMethod();
    if (paymentMethod.supportsRefunds() && this._paymentInfo.isCompleted()) {
      this._paymentInfo.updateTransactionInfo(
        this._paymentInfo.transactionId || '',
        'Refund initiated due to cancellation',
      );
    }

    return Result.success(undefined);
  }

  requiresPayment(): boolean {
    const paymentMethod = this.getPaymentMethod();

    // Online payments require immediate payment
    if (paymentMethod.requiresPaymentBeforeConfirmation()) {
      return this._paymentInfo.isPending();
    }

    if (paymentMethod.requiresPaymentOnDelivery()) {
      return this._status.isShipped() && !this._paymentInfo.isCompleted();
    }

    return false;
  }

  getNextExpectedAction(): string {
    if (this._status.isPending()) {
      const paymentMethod = this.getPaymentMethod();
      if (
        paymentMethod.requiresPaymentBeforeConfirmation() &&
        !this._paymentInfo.isCompleted()
      ) {
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
      const paymentMethod = this.getPaymentMethod();
      if (paymentMethod.requiresPaymentOnDelivery()) {
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

  updateCustomerInfo(updates: ICustomerInfoEditable): void {
    this.assertCanBeUpdated();
    this._customerInfo.updateContactInfo(updates);
    this._updatedAt = new Date();
  }

  updateItems(items: OrderItemProps[]): Result<void, DomainError> {
    this.assertCanBeUpdated();
    if (!items || items.length === 0) {
      return ErrorFactory.DomainError('Order must have at least one item');
    }
    this._items = items.map((item) => new OrderItem(item));
    this.recalculatePricing();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  updateShippingAddress(address: IShippingAddress): void {
    this.assertCanBeUpdated();
    this._shippingAddress = ShippingAddress.fromPrimitives(address);
    this._updatedAt = new Date();
  }

  updatePaymentInfo(paymentInfoUpdates: IPaymentInfoEditable): void {
    this.assertCanBeUpdated();

    if (paymentInfoUpdates.status) {
      const status = new PaymentStatusVO(paymentInfoUpdates.status);
      if (status.isCompleted()) {
        this._paymentInfo.markAsCompleted(
          paymentInfoUpdates.transactionId,
          paymentInfoUpdates.notes,
        );
      } else if (status.isFailed()) {
        this._paymentInfo.markAsFailed(paymentInfoUpdates.notes);
      }
    }

    if (paymentInfoUpdates.transactionId || paymentInfoUpdates.notes) {
      this._paymentInfo.updateTransactionInfo(
        paymentInfoUpdates.transactionId ||
          this._paymentInfo.transactionId ||
          '',
        paymentInfoUpdates.notes,
      );
    }

    this._updatedAt = new Date();
  }

  updateCustomerNotes(notes?: string): void {
    this.assertCanBeUpdated();
    this._customerNotes = notes ? notes.trim() : null;
    this._updatedAt = new Date();
  }

  updatePendingOrder(updates: {
    customerInfo?: ICustomerInfoEditable;
    items?: OrderItemProps[];
    shippingAddress?: IShippingAddress;
    paymentInfo?: IPaymentInfoEditable;
    customerNotes?: string;
  }): void {
    this.assertCanBeUpdated();

    if (updates.customerInfo) {
      this.updateCustomerInfo(updates.customerInfo);
    }
    if (updates.items) {
      this.updateItems(updates.items);
    }
    if (updates.shippingAddress) {
      this.updateShippingAddress(updates.shippingAddress);
    }
    if (updates.paymentInfo) {
      this.updatePaymentInfo(updates.paymentInfo);
    }
    if (updates.customerNotes !== undefined) {
      this.updateCustomerNotes(updates.customerNotes);
    }
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
    return this._status.isCancellable();
  }

  // ==================== SERIALIZATION ====================
  getItems(): OrderItem[] {
    return this._items;
  }

  toPrimitives(): IOrder {
    return {
      id: this._id,
      customerId: this._customerId,
      paymentInfoId: this._paymentInfoId,
      shippingAddressId: this._shippingAddressId,
      customerInfo: this.customerInfo,
      items: this.items,
      shippingAddress: this.shippingAddress,
      paymentInfo: this.paymentInfo,
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
    items: OrderItemProps[];
    customerInfo: CustomerInfoProps;
    shippingAddress: ShippingAddressProps;
    paymentInfo: Omit<PaymentInfoProps, 'status' | 'amount'>;
    customerNotes: string | null;
  }): Order {
    const orderItems = props.items.map((item) => new OrderItem(item));
    const pricing = OrderPricing.calculate(orderItems);
    const paymentMethod = new PaymentMethodVO(props.paymentInfo.method);

    const initialPaymentStatus = paymentMethod.requiresPaymentOnDelivery()
      ? PaymentStatus.NOT_REQUIRED_YET
      : PaymentStatus.PENDING;

    const paymentInfo: PaymentInfoProps = {
      id: props.paymentInfo.id,
      method: props.paymentInfo.method,
      status: initialPaymentStatus,
      amount: pricing.totalPrice,
      notes: props.paymentInfo.notes,
      transactionId: props.paymentInfo.transactionId,
      paidAt: props.paymentInfo.paidAt,
    };

    const payload: OrderProps = {
      id: props.id,
      customerId: props.customerInfo.customerId,
      paymentInfoId: props.paymentInfo.id,
      shippingAddressId: props.shippingAddress.id,
      customerInfo: props.customerInfo,
      items: props.items,
      shippingAddress: props.shippingAddress,
      paymentInfo: paymentInfo,
      customerNotes: props.customerNotes,
      status: OrderStatus.PENDING,
      createdAt: null,
      updatedAt: null,
    };
    return new Order(payload);
  }
}
