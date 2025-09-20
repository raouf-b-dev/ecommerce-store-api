// src/modules/orders/domain/entities/order.entity.ts
import { IOrder } from '../interfaces/IOrder';
import { IOrderItem } from '../interfaces/IOrderItem';
import { Money } from '../value-objects/money';
import { OrderStatus, OrderStatusVO } from '../value-objects/order-status';
import { PaymentStatus } from '../value-objects/payment-status';
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
} from '../interfaces/ICustomerInfo';
import { IPaymentInfo, IPaymentInfoEditable } from '../interfaces/IPaymentInfo';
import { IShippingAddress } from '../interfaces/IShippingAddress';

export interface OrderProps {
  id: string;
  customerId: string;
  customerInfo: CustomerInfoProps;
  items: OrderItemProps[];
  shippingAddress: ShippingAddressProps;
  paymentInfo: PaymentInfoProps;
  customerNotes?: string;
  status?: string | OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Order implements IOrder {
  private readonly _id: string;
  private readonly _customerId: string;
  private _customerInfo: CustomerInfo;
  private _items: OrderItem[];
  private _shippingAddress: ShippingAddress;
  private _paymentInfo: PaymentInfo;
  private _customerNotes?: string;
  private _status: OrderStatusVO;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: OrderProps) {
    this.validateProps(props);

    this._id = props.id.trim();
    this._customerId = props.customerId.trim();
    this._customerInfo = CustomerInfo.fromPrimitives(props.customerInfo);
    this._items = props.items.map((item) => new OrderItem(item));
    this._shippingAddress = ShippingAddress.fromPrimitives(
      props.shippingAddress,
    );
    this._paymentInfo = PaymentInfo.fromPrimitives(props.paymentInfo);
    this._customerNotes = props.customerNotes?.trim();
    this._status = new OrderStatusVO(props.status || OrderStatus.PENDING);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: OrderProps): void {
    if (!props.id?.trim()) {
      throw new Error('Order ID is required');
    }
    if (!props.customerInfo) {
      throw new Error('Customer information is required');
    }
    if (!props.items || props.items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    if (!props.shippingAddress) {
      throw new Error('Shipping address is required');
    }
    if (!props.paymentInfo) {
      throw new Error('Payment information is required');
    }
  }

  // Getters implementing IOrder interface
  get id(): string {
    return this._id;
  }
  get customerId(): string {
    return this._customerId;
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
      method: this._paymentInfo.method.value,
      status: this._paymentInfo.status.value,
      amount: this._paymentInfo.amount,
      transactionId: this._paymentInfo.transactionId,
      paidAt: this._paymentInfo.paidAt,
      notes: this._paymentInfo.notes,
    };
  }

  get customerNotes(): string | undefined {
    return this._customerNotes;
  }

  get status(): OrderStatus {
    return this._status.value;
  }

  get subtotal(): number {
    const subtotalMoney = this._items.reduce(
      (total, item) => total.add(item.lineTotal),
      Money.zero(),
    );
    return subtotalMoney.value;
  }

  get shippingCost(): number {
    return this.calculateShipping().value;
  }

  get totalPrice(): number {
    const subtotalMoney = Money.from(this.subtotal);
    const shippingMoney = Money.from(this.shippingCost);
    return subtotalMoney.add(shippingMoney).value;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Helper method to get items as entities (for internal use)
  getItemEntities(): readonly OrderItem[] {
    return [...this._items];
  }

  // Private helpers
  private calculateShipping(): Money {
    const baseRate = Money.fromNumber(5.99);
    const subtotalMoney = Money.from(this.subtotal);
    const freeShippingThreshold = Money.fromNumber(50);

    if (subtotalMoney.greaterThanOrEqual(freeShippingThreshold)) {
      return Money.zero();
    }

    return baseRate;
  }

  private assertCanBeUpdated(): void {
    if (!this._status.isPending()) {
      throw new Error('Order can only be updated when status is PENDING');
    }
  }

  // Update methods for editable properties
  updateCustomerInfo(updates: ICustomerInfoEditable): void {
    this.assertCanBeUpdated();
    this._customerInfo.updateContactInfo(updates);
    this._updatedAt = new Date();
  }

  updateItems(items: OrderItemProps[]): void {
    this.assertCanBeUpdated();

    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    this._items = items.map((item) => new OrderItem(item));
    this._updatedAt = new Date();
  }

  updateShippingAddress(address: IShippingAddress): void {
    this.assertCanBeUpdated();
    this._shippingAddress = ShippingAddress.fromPrimitives(address);
    this._updatedAt = new Date();
  }

  updatePaymentInfo(updates: IPaymentInfoEditable): void {
    this.assertCanBeUpdated();

    if (updates.status) {
      if (updates.status === PaymentStatus.COMPLETED) {
        this._paymentInfo.markAsCompleted(updates.transactionId, updates.notes);
      } else if (updates.status === PaymentStatus.FAILED) {
        this._paymentInfo.markAsFailed(updates.notes);
      }
    }

    if (updates.transactionId || updates.notes) {
      this._paymentInfo.updateTransactionInfo(
        updates.transactionId || this._paymentInfo.transactionId || '',
        updates.notes,
      );
    }

    this._updatedAt = new Date();
  }

  updateCustomerNotes(notes?: string): void {
    this.assertCanBeUpdated();
    this._customerNotes = notes?.trim();
    this._updatedAt = new Date();
  }

  // Bulk update method
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

  // Status transition methods
  changeStatus(newStatus: OrderStatus | string): void {
    const newStatusVO = new OrderStatusVO(newStatus);

    if (!this._status.canTransitionTo(newStatusVO.value)) {
      throw new Error(
        `Cannot transition from ${this._status.value} to ${newStatusVO.value}`,
      );
    }

    this._status = newStatusVO;
    this._updatedAt = new Date();
  }

  cancel(): void {
    this.changeStatus(OrderStatus.CANCELLED);
  }

  markAsPaid(): void {
    if (!this._paymentInfo.isCompleted()) {
      throw new Error('Cannot mark order as paid - payment not completed');
    }

    this.changeStatus(OrderStatus.PAID);
  }

  process(): void {
    this.changeStatus(OrderStatus.PROCESSING);
  }

  ship(): void {
    this.changeStatus(OrderStatus.SHIPPED);
  }

  deliver(): void {
    this.changeStatus(OrderStatus.DELIVERED);
  }

  // Business rules
  isEditable(): boolean {
    return this._status.isPending();
  }

  isProcessable(): boolean {
    return this._status.isPaid();
  }

  isShippable(): boolean {
    return this._status.isProcessing();
  }

  isCancellable(): boolean {
    return (
      this._status.isPending() ||
      this._status.isPaid() ||
      this._status.isProcessing()
    );
  }

  requiresPayment(): boolean {
    return (
      this._paymentInfo.method.requiresImmediatePayment() &&
      this._paymentInfo.isPending()
    );
  }

  // For persistence/serialization
  toPrimitives(): IOrder {
    return {
      id: this._id,
      customerId: this._customerId,
      customerInfo: this.customerInfo,
      items: this.items, // Already converted to IOrderItem[] by getter
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

  static fromPrimitives(data: any): Order {
    return new Order({
      id: data.id,
      customerId: data.customerId,
      customerInfo: data.customerInfo,
      items: data.items || [],
      shippingAddress: data.shippingAddress,
      paymentInfo: data.paymentInfo,
      customerNotes: data.customerNotes,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  static create(props: {
    id: string;
    customerId: string;
    customerInfo: CustomerInfoProps;
    items: OrderItemProps[];
    shippingAddress: ShippingAddressProps;
    paymentInfo: PaymentInfoProps;
    customerNotes?: string;
  }): Order {
    return new Order({
      id: props.id,
      customerId: props.customerId,
      customerInfo: props.customerInfo,
      items: props.items,
      shippingAddress: props.shippingAddress,
      paymentInfo: props.paymentInfo,
      customerNotes: props.customerNotes,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
