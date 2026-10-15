// src/modules/payments/core/domain/entities/payment.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { IPayment } from '../interfaces/payment.interface';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import {
  PaymentMethod,
  PaymentMethodType,
} from '../../../../../shared-kernel/domain/value-objects/payment-method';
import {
  PaymentStatus,
  PaymentStatusType,
} from '../value-objects/payment-status';
import { PaymentProviderId } from '../value-objects/payment-provider-id';

import { Refund, RefundProps } from './refund';

export interface CreatePaymentProps {
  id?: number | null;
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  provider: PaymentProviderId;
  userId?: number | null;
  paymentMethodInfo?: string | null;
}

export interface PaymentProps {
  id: number | null;
  orderId: number;
  userId: number | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  provider: PaymentProviderId;
  status: PaymentStatusType;
  transactionId: string | null;
  gatewayPaymentIntentId: string | null;
  gatewayClientSecret: string | null;
  paymentMethodInfo: string | null;
  refundedAmount: number;
  refunds: RefundProps[];
  failureReason: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
}

export class Payment implements IPayment {
  private readonly _id: number | null;
  private readonly _orderId: number;
  private _userId: number | null;
  private _amount: Money;
  private _paymentMethod: PaymentMethod;
  private readonly _provider: PaymentProviderId;
  private _status: PaymentStatus;
  private _transactionId: string | null;
  private _gatewayPaymentIntentId: string | null;
  private _gatewayClientSecret: string | null;
  private _paymentMethodInfo: string | null;
  private _refundedAmount: Money;
  private _refunds: Refund[];
  private _failureReason: string | null;
  private readonly _createdAt: Date;
  private _completedAt: Date | null;
  private _updatedAt: Date;

  constructor(props: PaymentProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id || null;
    this._orderId = props.orderId;
    this._userId = props.userId || null;
    const amount = Money.create(props.amount, props.currency);
    if (amount.isFailure) {
      throw amount.error;
    }
    this._amount = amount.value;
    this._paymentMethod = new PaymentMethod(props.paymentMethod);
    this._provider = props.provider;
    this._status = new PaymentStatus(props.status);
    this._transactionId = props.transactionId?.trim() || null;
    this._gatewayPaymentIntentId = props.gatewayPaymentIntentId?.trim() || null;
    this._gatewayClientSecret = props.gatewayClientSecret?.trim() || null;
    this._paymentMethodInfo = props.paymentMethodInfo?.trim() || null;
    const refundedAmount = Money.create(props.refundedAmount, props.currency);
    if (refundedAmount.isFailure) {
      throw refundedAmount.error;
    }
    this._refundedAmount = refundedAmount.value;
    this._refunds = props.refunds
      ? props.refunds.map((r) => new Refund(r))
      : [];
    this._failureReason = props.failureReason?.trim() || null;
    this._createdAt = props.createdAt || new Date();
    this._completedAt = props.completedAt;
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: PaymentProps): Result<void, DomainError> {
    if (props.id !== null && !props.id) {
      return ErrorFactory.DomainError('Payment ID is required');
    }
    if (!props.orderId) {
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
  get id(): number | null {
    return this._id;
  }

  get orderId(): number {
    return this._orderId;
  }

  get userId(): number | null {
    return this._userId;
  }

  get amount(): number {
    return this._amount.amount;
  }

  get money(): Money {
    return this._amount;
  }

  get currency(): string {
    return this._amount.currency;
  }

  get paymentMethod(): PaymentMethodType {
    return this._paymentMethod.type;
  }

  get provider(): string {
    return this._provider.value;
  }

  get providerId(): PaymentProviderId {
    return this._provider;
  }

  get status(): PaymentStatusType {
    return this._status.status;
  }

  get transactionId(): string | null {
    return this._transactionId;
  }

  get gatewayPaymentIntentId(): string | null {
    return this._gatewayPaymentIntentId;
  }

  get gatewayClientSecret(): string | null {
    return this._gatewayClientSecret;
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

  /**
   * Set the payment intent details from gateway response.
   * Called after creating a payment intent.
   */
  setPaymentIntent(
    paymentIntentId: string,
    clientSecret: string,
  ): Result<void, DomainError> {
    if (!paymentIntentId?.trim()) {
      return ErrorFactory.DomainError('Payment intent ID is required');
    }
    if (!clientSecret?.trim()) {
      return ErrorFactory.DomainError('Client secret is required');
    }

    if (!this._status.isPending()) {
      return ErrorFactory.DomainError(
        'Can only set payment intent on pending payments',
      );
    }

    this._gatewayPaymentIntentId = paymentIntentId.trim();
    this._gatewayClientSecret = clientSecret.trim();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

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

  addRefund(refund: Refund): Result<void, DomainError> {
    if (!this._status.canBeRefunded()) {
      return ErrorFactory.DomainError(
        'Payment cannot be refunded in current status',
      );
    }

    if (refund.amount < 0) {
      return ErrorFactory.DomainError('Refund amount cannot be negative');
    }

    const totalRefunded = this._refundedAmount.amount + refund.amount;
    if (totalRefunded > this._amount.amount) {
      return ErrorFactory.DomainError(
        'Total refunded amount cannot exceed payment amount',
      );
    }

    const refunded = Money.create(totalRefunded, this._amount.currency);
    if (refunded.isFailure) {
      return refunded;
    }
    this._refundedAmount = refunded.value;
    this._refunds.push(refund);

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

  canBeRefunded(): boolean {
    return this._status.canBeRefunded();
  }

  isFullyRefunded(): boolean {
    return this._refundedAmount.equals(this._amount);
  }

  isPartiallyRefunded(): boolean {
    return this._refundedAmount.amount > 0 && !this.isFullyRefunded();
  }

  get refunds(): Refund[] {
    return this._refunds;
  }

  // Serialization
  toPrimitives(): IPayment {
    return {
      id: this._id,
      orderId: this._orderId,
      userId: this._userId,
      amount: this._amount.amount,
      currency: this._amount.currency,
      paymentMethod: this._paymentMethod.type,
      provider: this._provider.value,
      status: this._status.status,
      transactionId: this._transactionId,
      gatewayPaymentIntentId: this._gatewayPaymentIntentId,
      gatewayClientSecret: this._gatewayClientSecret,
      paymentMethodInfo: this._paymentMethodInfo,
      refundedAmount: this._refundedAmount.amount,
      refunds: this._refunds.map((r) => r.toPrimitives()),
      failureReason: this._failureReason,
      createdAt: this._createdAt,
      completedAt: this._completedAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: IPayment): Payment {
    const providerResult = PaymentProviderId.create(data.provider);
    if (providerResult.isFailure) {
      throw providerResult.error;
    }

    const props: PaymentProps = {
      id: data.id,
      orderId: data.orderId,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      provider: providerResult.value,
      status: data.status,
      transactionId: data.transactionId,
      gatewayPaymentIntentId: data.gatewayPaymentIntentId,
      gatewayClientSecret: data.gatewayClientSecret,
      paymentMethodInfo: data.paymentMethodInfo,
      refundedAmount: data.refundedAmount,
      refunds: data.refunds
        ? data.refunds.map((r) => (r instanceof Refund ? r.props : r))
        : [],
      failureReason: data.failureReason,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      updatedAt: data.updatedAt,
    };
    return new Payment(props);
  }

  static create(props: CreatePaymentProps): Payment {
    return new Payment({
      id: props.id ?? null,
      orderId: props.orderId,
      userId: props.userId ?? null,
      amount: props.amount,
      currency: props.currency,
      paymentMethod: props.paymentMethod,
      provider: props.provider,
      status: PaymentStatusType.PENDING,
      transactionId: null,
      gatewayPaymentIntentId: null,
      gatewayClientSecret: null,
      paymentMethodInfo: props.paymentMethodInfo ?? null,
      refundedAmount: 0,
      refunds: [],
      failureReason: null,
      createdAt: new Date(),
      completedAt: null,
      updatedAt: new Date(),
    });
  }
}
