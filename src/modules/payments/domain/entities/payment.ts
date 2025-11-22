// src/modules/payments/domain/entities/payment.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { IPayment } from '../interfaces/payment.interface';
import { Money } from '../value-objects/money';
import {
  PaymentMethod,
  PaymentMethodType,
} from '../value-objects/payment-method';
import {
  PaymentStatus,
  PaymentStatusType,
} from '../value-objects/payment-status';

export interface PaymentProps {
  id: string;
  orderId: string;
  customerId: string | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  status: PaymentStatusType;
  transactionId: string | null;
  paymentMethodInfo: string | null;
  refundedAmount: number;
  failureReason: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
}

export class Payment implements IPayment {
  private readonly _id: string;
  private readonly _orderId: string;
  private _customerId: string | null;
  private _amount: Money;
  private _paymentMethod: PaymentMethod;
  private _status: PaymentStatus;
  private _transactionId: string | null;
  private _paymentMethodInfo: string | null;
  private _refundedAmount: Money;
  private _failureReason: string | null;
  private readonly _createdAt: Date;
  private _completedAt: Date | null;
  private _updatedAt: Date;

  constructor(props: PaymentProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id.trim();
    this._orderId = props.orderId.trim();
    this._customerId = props.customerId?.trim() || null;
    this._amount = Money.from(props.amount, props.currency);
    this._paymentMethod = new PaymentMethod(props.paymentMethod);
    this._status = new PaymentStatus(props.status);
    this._transactionId = props.transactionId?.trim() || null;
    this._paymentMethodInfo = props.paymentMethodInfo?.trim() || null;
    this._refundedAmount = Money.from(props.refundedAmount, props.currency);
    this._failureReason = props.failureReason?.trim() || null;
    this._createdAt = props.createdAt || new Date();
    this._completedAt = props.completedAt;
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: PaymentProps): Result<void, DomainError> {
    if (!props.id?.trim()) {
      return ErrorFactory.DomainError('Payment ID is required');
    }
    if (!props.orderId?.trim()) {
      return ErrorFactory.DomainError('Order ID is required');
    }
    if (props.amount < 0) {
      return ErrorFactory.DomainError('Payment amount cannot be negative');
    }
    if (!props.currency?.trim()) {
      return ErrorFactory.DomainError('Currency is required');
    }
    if (props.refundedAmount < 0) {
      return ErrorFactory.DomainError('Refunded amount cannot be negative');
    }
    if (props.refundedAmount > props.amount) {
      return ErrorFactory.DomainError(
        'Refunded amount cannot exceed payment amount',
      );
    }

    return Result.success(undefined);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get orderId(): string {
    return this._orderId;
  }

  get customerId(): string | null {
    return this._customerId;
  }

  get amount(): number {
    return this._amount.amount;
  }

  get currency(): string {
    return this._amount.currency;
  }

  get paymentMethod(): string {
    return this._paymentMethod.type;
  }

  get status(): string {
    return this._status.status;
  }

  get transactionId(): string | null {
    return this._transactionId;
  }

  get paymentMethodInfo(): string | null {
    return this._paymentMethodInfo;
  }

  get refundedAmount(): number {
    return this._refundedAmount.amount;
  }

  get remainingAmount(): number {
    const remaining = this._amount.subtract(this._refundedAmount);
    return remaining.isSuccess ? remaining.value.amount : 0;
  }

  get failureReason(): string | null {
    return this._failureReason;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get completedAt(): Date | null {
    return this._completedAt ? new Date(this._completedAt) : null;
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Business logic methods
  authorize(transactionId: string): Result<void, DomainError> {
    if (!transactionId?.trim()) {
      return ErrorFactory.DomainError('Transaction ID is required');
    }

    if (!this._status.isPending()) {
      return ErrorFactory.DomainError('Can only authorize pending payments');
    }

    this._transactionId = transactionId.trim();
    this._status = new PaymentStatus(PaymentStatusType.AUTHORIZED);
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  capture(): Result<void, DomainError> {
    if (!this._status.isAuthorized()) {
      return ErrorFactory.DomainError('Can only capture authorized payments');
    }

    this._status = new PaymentStatus(PaymentStatusType.CAPTURED);
    this._completedAt = new Date();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  complete(
    transactionId?: string,
    paymentMethodInfo?: string,
  ): Result<void, DomainError> {
    if (!this._status.isPending() && !this._status.isAuthorized()) {
      return ErrorFactory.DomainError(
        'Can only complete pending or authorized payments',
      );
    }

    if (transactionId) {
      this._transactionId = transactionId.trim();
    }
    if (paymentMethodInfo) {
      this._paymentMethodInfo = paymentMethodInfo.trim();
    }

    this._status = new PaymentStatus(PaymentStatusType.COMPLETED);
    this._completedAt = new Date();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  fail(reason: string): Result<void, DomainError> {
    if (!reason?.trim()) {
      return ErrorFactory.DomainError('Failure reason is required');
    }

    if (this._status.isFailed() || this._status.isCompleted()) {
      return ErrorFactory.DomainError(
        'Cannot fail a payment that is already failed or completed',
      );
    }

    this._status = new PaymentStatus(PaymentStatusType.FAILED);
    this._failureReason = reason.trim();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  addRefund(refundAmount: number): Result<void, DomainError> {
    if (!this._status.canBeRefunded()) {
      return ErrorFactory.DomainError(
        'Payment cannot be refunded in current status',
      );
    }

    if (refundAmount < 0) {
      return ErrorFactory.DomainError('Refund amount cannot be negative');
    }

    const totalRefunded = this._refundedAmount.amount + refundAmount;
    if (totalRefunded > this._amount.amount) {
      return ErrorFactory.DomainError(
        'Total refunded amount cannot exceed payment amount',
      );
    }

    this._refundedAmount = Money.from(totalRefunded, this._amount.currency);

    // Update status based on refund amount
    if (totalRefunded === this._amount.amount) {
      this._status = new PaymentStatus(PaymentStatusType.REFUNDED);
    } else if (totalRefunded > 0) {
      this._status = new PaymentStatus(PaymentStatusType.PARTIALLY_REFUNDED);
    }

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  cancel(): Result<void, DomainError> {
    if (this._status.isCompleted() || this._status.isFailed()) {
      return ErrorFactory.DomainError(
        'Cannot cancel a completed or failed payment',
      );
    }

    this._status = new PaymentStatus(PaymentStatusType.CANCELLED);
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  // Query methods
  isPending(): boolean {
    return this._status.isPending();
  }

  isCompleted(): boolean {
    return this._status.isCompleted();
  }

  isFailed(): boolean {
    return this._status.isFailed();
  }

  isRefunded(): boolean {
    return this._status.isRefunded();
  }

  isFullyRefunded(): boolean {
    return this._refundedAmount.equals(this._amount);
  }

  isPartiallyRefunded(): boolean {
    return this._refundedAmount.amount > 0 && !this.isFullyRefunded();
  }

  isCOD(): boolean {
    return this._paymentMethod.isCOD();
  }

  // Serialization
  toPrimitives(): IPayment {
    return {
      id: this._id,
      orderId: this._orderId,
      customerId: this._customerId,
      amount: this._amount.amount,
      currency: this._amount.currency,
      paymentMethod: this._paymentMethod.type,
      status: this._status.status,
      transactionId: this._transactionId,
      paymentMethodInfo: this._paymentMethodInfo,
      refundedAmount: this._refundedAmount.amount,
      failureReason: this._failureReason,
      createdAt: this._createdAt,
      completedAt: this._completedAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: PaymentProps): Payment {
    return new Payment(data);
  }

  static create(
    id: string,
    orderId: string,
    amount: number,
    currency: string,
    paymentMethod: PaymentMethodType,
    customerId?: string,
    paymentMethodInfo?: string,
  ): Payment {
    return new Payment({
      id,
      orderId,
      customerId: customerId || null,
      amount,
      currency,
      paymentMethod,
      status: PaymentStatusType.PENDING,
      transactionId: null,
      paymentMethodInfo: paymentMethodInfo || null,
      refundedAmount: 0,
      failureReason: null,
      createdAt: new Date(),
      completedAt: null,
      updatedAt: new Date(),
    });
  }

  static createCOD(
    id: string,
    orderId: string,
    amount: number,
    currency: string,
    customerId?: string,
  ): Payment {
    return new Payment({
      id,
      orderId,
      customerId: customerId || null,
      amount,
      currency,
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      status: PaymentStatusType.NOT_REQUIRED_YET,
      transactionId: null,
      paymentMethodInfo: null,
      refundedAmount: 0,
      failureReason: null,
      createdAt: new Date(),
      completedAt: null,
      updatedAt: new Date(),
    });
  }
}
