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

  private getPaymentMethod(): PaymentMethodVO {
    return new PaymentMethodVO(this._paymentInfo.method);
  }

  // ==================== BUSINESS RULES ====================
  private assertCanBeUpdated(): void {
    if (!this._status.isPending()) {
      throw new Error('Order can only be updated when status is PENDING');
    }
  }

  canBeConfirmed(): boolean {
    if (!this._status.isPending()) {
      return false;
    }

    const paymentMethod = this.getPaymentMethod();

    // Online payments require payment completion before confirmation
    if (paymentMethod.requiresPaymentBeforeConfirmation()) {
      return this._paymentInfo.isCompleted();
    }

    return true;
  }

  confirm(): void {
    if (!this.canBeConfirmed()) {
      const paymentMethod = this.getPaymentMethod();

      if (paymentMethod.requiresPaymentBeforeConfirmation()) {
        throw new Error(
          'Cannot confirm order - payment must be completed first',
        );
      }

      throw new Error('Order cannot be confirmed in current state');
    }

    this.changeStatus(OrderStatus.CONFIRMED);
  }

  canBeProcessed(): boolean {
    return this._status.isConfirmed();
  }

  process(): void {
    if (!this.canBeProcessed()) {
      throw new Error('Order must be confirmed before processing');
    }
    this.changeStatus(OrderStatus.PROCESSING);
  }

  canBeShipped(): boolean {
    return this._status.isProcessing();
  }

  ship(): void {
    if (!this.canBeShipped()) {
      throw new Error('Order must be in processing state to ship');
    }
    this.changeStatus(OrderStatus.SHIPPED);
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
  }): void {
    if (!this.canBeDelivered()) {
      throw new Error('Order cannot be delivered in current state');
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

    this.changeStatus(OrderStatus.DELIVERED);
  }

  isCancellable(): boolean {
    return (
      this._status.isPending() ||
      this._status.isConfirmed() ||
      this._status.isProcessing() ||
      this._status.isShipped()
    );
  }

  cancel(reason?: string): void {
    if (!this.isCancellable()) {
      throw new Error('Order cannot be cancelled in current state');
    }

    if (reason) {
      this._customerNotes = this._customerNotes
        ? `${this._customerNotes}\n\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }

    this.changeStatus(OrderStatus.CANCELLED);

    const paymentMethod = this.getPaymentMethod();
    if (paymentMethod.supportsRefunds() && this._paymentInfo.isCompleted()) {
      this._paymentInfo.updateTransactionInfo(
        this._paymentInfo.transactionId || '',
        'Refund initiated due to cancellation',
      );
    }
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

  private changeStatus(newStatus: OrderStatus | string): void {
    const newStatusVO = new OrderStatusVO(newStatus);

    if (!this._status.canTransitionTo(newStatusVO.value)) {
      throw new Error(
        `Cannot transition from ${this._status.value} to ${newStatusVO.value}`,
      );
    }

    this._status = newStatusVO;
    this._updatedAt = new Date();
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
    const paymentMethod = new PaymentMethodVO(props.paymentInfo.method);

    // Set initial payment status based on payment method
    const initialPaymentStatus = paymentMethod.requiresPaymentOnDelivery()
      ? PaymentStatus.NOT_REQUIRED_YET
      : PaymentStatus.PENDING;

    const paymentInfo: PaymentInfoProps = {
      id: props.paymentInfo.id,
      method: props.paymentInfo.method,
      status: initialPaymentStatus,
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
