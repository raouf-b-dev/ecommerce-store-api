// src/modules/orders/domain/value-objects/payment-info.ts
import { PaymentStatus, PaymentStatusVO } from './payment-status';
import { PaymentMethod, PaymentMethodVO } from './payment-method';

export interface PaymentInfoProps {
  method: PaymentMethod | string;
  status: PaymentStatus | string;
  amount: number;
  transactionId?: string;
  paidAt?: Date;
  notes?: string;
}

export class PaymentInfo {
  private readonly _method: PaymentMethodVO;
  private _status: PaymentStatusVO;
  private readonly _amount: number;
  private _transactionId?: string;
  private _paidAt?: Date;
  private _notes?: string;

  constructor(props: PaymentInfoProps) {
    this.validateProps(props);

    this._method = new PaymentMethodVO(props.method);
    this._status = new PaymentStatusVO(props.status);
    this._amount = props.amount;
    this._transactionId = props.transactionId;
    this._paidAt = props.paidAt;
    this._notes = props.notes?.trim();
  }

  private validateProps(props: PaymentInfoProps): void {
    if (props.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // Business rule: COD completed payments must have paidAt
    if (
      this._method.isCashOnDelivery() &&
      this._status.isCompleted() &&
      !props.paidAt
    ) {
      throw new Error('Completed COD payment must have paidAt date');
    }
  }

  // Getters
  get method(): PaymentMethodVO {
    return this._method;
  }

  get status(): PaymentStatusVO {
    return this._status;
  }

  get amount(): number {
    return this._amount;
  }

  get transactionId(): string | undefined {
    return this._transactionId;
  }

  get paidAt(): Date | undefined {
    return this._paidAt;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  // Business methods combining both VOs
  markAsCompleted(transactionId?: string, notes?: string): void {
    if (!this._status.canTransitionTo(PaymentStatus.COMPLETED)) {
      throw new Error(
        `Cannot mark payment as completed from status: ${this._status.value}`,
      );
    }

    this._status = PaymentStatusVO.completed();
    this._paidAt = new Date();

    if (transactionId) {
      this._transactionId = transactionId;
    }

    if (notes) {
      this._notes = notes.trim();
    }
  }

  markAsFailed(reason?: string): void {
    if (!this._status.canTransitionTo(PaymentStatus.FAILED)) {
      throw new Error(
        `Cannot mark payment as failed from status: ${this._status.value}`,
      );
    }

    this._status = PaymentStatusVO.failed();
    this._notes = reason?.trim();
  }

  updateTransactionInfo(transactionId: string, notes?: string): void {
    this._transactionId = transactionId;
    if (notes) {
      this._notes = notes.trim();
    }
  }

  // Business queries using both VOs
  isPending(): boolean {
    return this._status.isPending();
  }

  isCompleted(): boolean {
    return this._status.isCompleted();
  }

  isFailed(): boolean {
    return this._status.isFailed();
  }

  isCashOnDelivery(): boolean {
    return this._method.isCashOnDelivery();
  }

  requiresImmediatePayment(): boolean {
    return this._method.requiresImmediatePayment();
  }

  supportsRefunds(): boolean {
    return this._method.supportsRefunds() && this.isCompleted();
  }

  getProcessingFee(): number {
    return this._method.getProcessingFee(this._amount);
  }

  getDisplayInfo(): string {
    const statusText =
      this._status.value.charAt(0).toUpperCase() + this._status.value.slice(1);
    return `${this._method.getDisplayName()} - ${statusText}`;
  }

  // Value object equality
  equals(other: PaymentInfo): boolean {
    if (!other) return false;
    return (
      this._method.equals(other._method) &&
      this._status.equals(other._status) &&
      this._amount === other._amount &&
      this._transactionId === other._transactionId &&
      this._paidAt?.getTime() === other._paidAt?.getTime() &&
      this._notes === other._notes
    );
  }

  // For persistence/serialization
  toPrimitives(): PaymentInfoProps {
    return {
      method: this._method.value, // Convert VO to primitive
      status: this._status.value, // Convert VO to primitive
      amount: this._amount,
      transactionId: this._transactionId,
      paidAt: this._paidAt,
      notes: this._notes,
    };
  }

  static fromPrimitives(data: PaymentInfoProps): PaymentInfo {
    return new PaymentInfo(data);
  }

  // Factory methods for common use cases
  static createCOD(amount: number): PaymentInfo {
    return new PaymentInfo({
      method: PaymentMethod.CASH_ON_DELIVERY,
      status: PaymentStatus.PENDING,
      amount,
    });
  }

  static createStripe(amount: number, transactionId?: string): PaymentInfo {
    return new PaymentInfo({
      method: PaymentMethod.STRIPE,
      status: transactionId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      amount,
      transactionId,
      paidAt: transactionId ? new Date() : undefined,
    });
  }

  static createPayPal(amount: number, transactionId?: string): PaymentInfo {
    return new PaymentInfo({
      method: PaymentMethod.PAYPAL,
      status: transactionId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      amount,
      transactionId,
      paidAt: transactionId ? new Date() : undefined,
    });
  }
}
