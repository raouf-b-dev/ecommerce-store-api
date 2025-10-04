// src/modules/orders/domain/entities/order.entity.ts
import { IOrder } from '../interfaces/IOrder';
import { IOrderItem } from '../interfaces/IOrderItem';
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
} from '../interfaces/ICustomerInfo';
import { IPaymentInfo, IPaymentInfoEditable } from '../interfaces/IPaymentInfo';
import { IShippingAddress } from '../interfaces/IShippingAddress';
import {
  PaymentStatus,
  PaymentStatusVO,
} from '../value-objects/payment-status';
import { OrderPricing } from '../value-objects/order-pricing';

export interface OrderProps {
  id: string;
  customerId: string;
  paymentInfoId: string;
  shippingAddressId: string;
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
  private readonly _paymentInfoId: string;
  private readonly _shippingAddressId: string;
  private _customerInfo: CustomerInfo;
  private _items: OrderItem[];
  private _shippingAddress: ShippingAddress;
  private _paymentInfo: PaymentInfo;
  private _customerNotes?: string;
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
    this._customerNotes = props.customerNotes?.trim();
    this._status = new OrderStatusVO(props.status || OrderStatus.PENDING);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();

    this._pricing = OrderPricing.calculate(this._items);
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

  get customerNotes(): string | undefined {
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

  getItemEntities(): readonly OrderItem[] {
    return [...this._items];
  }

  getPricing(): OrderPricing {
    return this._pricing;
  }

  private assertCanBeUpdated(): void {
    if (!this._status.isPending()) {
      throw new Error('Order can only be updated when status is PENDING');
    }
  }

  private recalculatePricing(): void {
    this._pricing = OrderPricing.recalculate(this._items);
  }

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
    this.recalculatePricing();
    this._updatedAt = new Date();
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
    this._customerNotes = notes?.trim();
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
      this._paymentInfo.requiresImmediatePayment() &&
      this._paymentInfo.isPending()
    );
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
    customerNotes?: string;
  }): Order {
    const orderItems = props.items.map((item) => new OrderItem(item));
    const pricing = OrderPricing.calculate(orderItems);

    const paymentInfo: PaymentInfoProps = {
      id: props.paymentInfo.id,
      method: props.paymentInfo.method,
      status: PaymentStatus.PENDING,
      amount: pricing.totalPrice,
      notes: props.paymentInfo.notes,
    };

    return new Order({
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
    });
  }
}
