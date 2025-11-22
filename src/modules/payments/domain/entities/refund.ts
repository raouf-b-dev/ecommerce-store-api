// src/modules/payments/domain/entities/refund.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { IRefund } from '../interfaces/refund.interface';
import { Money } from '../value-objects/money';
import { RefundStatus, RefundStatusType } from '../value-objects/refund-status';

export interface RefundProps {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatusType;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Refund {
  private readonly _id: string;
  private readonly _paymentId: string;
  private _amount: Money;
  private _reason: string;
  private _status: RefundStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RefundProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id.trim();
    this._paymentId = props.paymentId.trim();
    this._amount = Money.from(props.amount, props.currency);
    this._reason = props.reason.trim();
    this._status = new RefundStatus(props.status);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: RefundProps): Result<void, DomainError> {
    if (!props.id?.trim()) {
      return ErrorFactory.DomainError('Refund ID is required');
    }
    if (!props.paymentId?.trim()) {
      return ErrorFactory.DomainError('Payment ID is required');
    }
    if (props.amount < 0) {
      return ErrorFactory.DomainError('Refund amount cannot be negative');
    }
    if (!props.currency?.trim()) {
      return ErrorFactory.DomainError('Currency is required');
    }
    if (!props.reason?.trim()) {
      return ErrorFactory.DomainError('Refund reason is required');
    }

    return Result.success(undefined);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get paymentId(): string {
    return this._paymentId;
  }

  get amount(): number {
    return this._amount.amount;
  }

  get currency(): string {
    return this._amount.currency;
  }

  get reason(): string {
    return this._reason;
  }

  get status(): RefundStatusType {
    return this._status.status;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Business logic methods
  isPending(): boolean {
    return this._status.isPending();
  }

  isCompleted(): boolean {
    return this._status.isCompleted();
  }

  isFailed(): boolean {
    return this._status.isFailed();
  }

  approve(): void {
    this._status = new RefundStatus(RefundStatusType.APPROVED);
    this._updatedAt = new Date();
  }

  reject(reason?: string): void {
    this._status = new RefundStatus(RefundStatusType.REJECTED);
    if (reason) {
      this._reason = reason;
    }
    this._updatedAt = new Date();
  }

  markAsProcessing(): void {
    this._status = new RefundStatus(RefundStatusType.PROCESSING);
    this._updatedAt = new Date();
  }

  markAsCompleted(): void {
    this._status = new RefundStatus(RefundStatusType.COMPLETED);
    this._updatedAt = new Date();
  }

  markAsFailed(reason?: string): void {
    this._status = new RefundStatus(RefundStatusType.FAILED);
    if (reason) {
      this._reason = reason;
    }
    this._updatedAt = new Date();
  }

  // Serialization
  toPrimitives(): IRefund {
    return {
      id: this._id,
      paymentId: this._paymentId,
      amount: this._amount.amount,
      reason: this._reason,
      status: this._status.status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: RefundProps): Refund {
    return new Refund(data);
  }

  static create(
    id: string,
    paymentId: string,
    amount: number,
    currency: string,
    reason: string,
  ): Refund {
    return new Refund({
      id,
      paymentId,
      amount,
      currency,
      reason,
      status: RefundStatusType.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
