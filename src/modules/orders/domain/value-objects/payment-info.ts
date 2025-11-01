// src/modules/orders/domain/value-objects/payment-info.ts
import { PaymentStatus, PaymentStatusVO } from './payment-status';
import { PaymentMethod, PaymentMethodVO } from './payment-method';
import { IPaymentInfo } from '../interfaces/payment-info.interface';

export interface PaymentInfoProps {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionId: string | null;
  paidAt: Date | null;
  notes: string | null;
}

export class PaymentInfo implements IPaymentInfo {
  private readonly _id: string;
  private readonly _method: PaymentMethodVO;
  private _status: PaymentStatusVO;
  private readonly _amount: number;
  private _transactionId: string | null;
  private _paidAt: Date | null;
  private _notes: string | null;

  constructor(props: PaymentInfoProps) {
    this.validateProps(props);

    this._id = props.id;
    this._method = new PaymentMethodVO(props.method);
    this._status = new PaymentStatusVO(props.status);
    this._amount = props.amount;
    this._transactionId = props.transactionId;
    this._paidAt = props.paidAt;
    this._notes = props.notes ? props.notes.trim() : null;

    // Validate status makes sense for payment method
    this.validateStatusForMethod();
  }

  private validateProps(props: PaymentInfoProps): void {
    if (props.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
  }

  private validateStatusForMethod(): void {
    // NOT_REQUIRED_YET should only be used for COD
    if (this._status.isNotRequiredYet() && !this._method.isCashOnDelivery()) {
      throw new Error(
        'NOT_REQUIRED_YET status can only be used with Cash on Delivery',
      );
    }

    // Online payments should never start with NOT_REQUIRED_YET
    if (
      this._method.requiresPaymentBeforeConfirmation() &&
      this._status.isNotRequiredYet()
    ) {
      throw new Error('Online payment methods must start with PENDING status');
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get method(): PaymentMethod {
    return this._method.value;
  }

  get status(): PaymentStatus {
    return this._status.value;
  }

  get amount(): number {
    return this._amount;
  }

  get transactionId(): string | null {
    return this._transactionId;
  }

  get paidAt(): Date | null {
    return this._paidAt;
  }

  get notes(): string | null {
    return this._notes;
  }

  // Status query methods
  isPending(): boolean {
    return this._status.isPending();
  }

  isCompleted(): boolean {
    return this._status.isCompleted();
  }

  isFailed(): boolean {
    return this._status.isFailed();
  }

  isNotRequiredYet(): boolean {
    return this._status.isNotRequiredYet();
  }

  // Payment method query methods
  isCashOnDelivery(): boolean {
    return this._method.isCashOnDelivery();
  }

  requiresImmediatePayment(): boolean {
    return this._method.requiresPaymentBeforeConfirmation();
  }

  requiresPaymentOnDelivery(): boolean {
    return this._method.requiresPaymentOnDelivery();
  }

  supportsRefunds(): boolean {
    return this._method.supportsRefunds() && this.isCompleted();
  }

  getProcessingFee(): number {
    return this._method.getProcessingFee(this._amount);
  }

  // State transition methods
  markAsCompleted(transactionId: string | null, notes: string | null): void {
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

  markAsFailed(reason: string | null): void {
    if (!this._status.canTransitionTo(PaymentStatus.FAILED)) {
      throw new Error(
        `Cannot mark payment as failed from status: ${this._status.value}`,
      );
    }

    this._status = PaymentStatusVO.failed();
    this._notes = reason ? reason.trim() : null;
  }

  /**
   * For COD orders: transition from NOT_REQUIRED_YET to PENDING
   * when the order is ready for delivery
   */
  markAsReadyForCollection(): void {
    if (!this._method.requiresPaymentOnDelivery()) {
      throw new Error(
        'Only COD payments can be marked as ready for collection',
      );
    }

    if (!this._status.isNotRequiredYet()) {
      throw new Error(
        'Payment must be in NOT_REQUIRED_YET status to mark as ready for collection',
      );
    }

    this._status = PaymentStatusVO.pending();
    this._notes = 'Ready for payment collection on delivery';
  }

  /**
   * Retry a failed payment (transition back to PENDING)
   */
  retryPayment(): void {
    if (!this._status.isFailed()) {
      throw new Error('Can only retry failed payments');
    }

    if (!this._status.canTransitionTo(PaymentStatus.PENDING)) {
      throw new Error('Cannot retry payment in current state');
    }

    this._status = PaymentStatusVO.pending();
    this._notes = 'Payment retry initiated';
  }

  updateTransactionInfo(transactionId: string, notes: string | null): void {
    this._transactionId = transactionId;
    if (notes) {
      this._notes = notes.trim();
    }
  }

  // Display methods
  getDisplayInfo(): string {
    const statusText =
      this._status.value.charAt(0).toUpperCase() + this._status.value.slice(1);
    return `${this._method.getDisplayName()} - ${statusText}`;
  }

  getStatusDescription(): string {
    if (this._status.isNotRequiredYet()) {
      return 'Payment will be collected on delivery';
    }
    if (this._status.isPending() && this._method.requiresPaymentOnDelivery()) {
      return 'Payment to be collected on delivery';
    }
    if (
      this._status.isPending() &&
      this._method.requiresPaymentBeforeConfirmation()
    ) {
      return 'Awaiting payment';
    }
    if (this._status.isCompleted()) {
      return `Paid${this._paidAt ? ` on ${this._paidAt.toLocaleDateString()}` : ''}`;
    }
    if (this._status.isFailed()) {
      return 'Payment failed';
    }
    return this._status.value;
  }

  /**
   * Check if payment is blocking order progression
   */
  isBlockingOrderProgression(): boolean {
    // Online payments block confirmation when pending
    if (this._method.requiresPaymentBeforeConfirmation()) {
      return this._status.isPending();
    }

    // COD never blocks progression (payment happens at delivery)
    return false;
  }

  /**
   * Check if payment should be collected now
   */
  shouldCollectPaymentNow(): boolean {
    // Only for COD when status is PENDING (at delivery time)
    return this._method.requiresPaymentOnDelivery() && this._status.isPending();
  }

  // Value object equality
  equals(other: PaymentInfo): boolean {
    if (!other) return false;
    return (
      this._id === other._id &&
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
      id: this._id,
      method: this._method.value,
      status: this._status.value,
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
  static createCOD(
    id: string,
    amount: number,
    notes?: string,
    transactionId?: string,
    paidAt?: Date,
  ): PaymentInfo {
    const props: PaymentInfoProps = {
      id,
      method: PaymentMethod.CASH_ON_DELIVERY,
      status: PaymentStatus.NOT_REQUIRED_YET,
      amount,
      notes: notes || 'Payment on delivery',
      transactionId: transactionId || null,
      paidAt: paidAt || null,
    };
    return new PaymentInfo(props);
  }

  /**
   * Create Stripe payment - starts with PENDING unless transaction ID provided
   */
  static createStripe(
    id: string,
    amount: number,
    transactionId?: string,
    notes?: string,
  ): PaymentInfo {
    return new PaymentInfo({
      id,
      method: PaymentMethod.STRIPE,
      status: transactionId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      amount,
      transactionId: transactionId || null,
      paidAt: transactionId ? new Date() : null,
      notes: notes || null,
    });
  }

  static createPayPal(
    id: string,
    amount: number,
    transactionId?: string,
    notes?: string,
  ): PaymentInfo {
    return new PaymentInfo({
      id,
      method: PaymentMethod.PAYPAL,
      status: transactionId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      amount,
      transactionId: transactionId || null,
      paidAt: transactionId ? new Date() : null,
      notes: notes || null,
    });
  }

  static createCreditCard(
    id: string,
    amount: number,
    transactionId?: string,
    notes?: string,
  ): PaymentInfo {
    return new PaymentInfo({
      id,
      method: PaymentMethod.CREDIT_CARD,
      status: transactionId ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      amount,
      transactionId: transactionId || null,
      paidAt: transactionId ? new Date() : null,
      notes: notes || null,
    });
  }
}
