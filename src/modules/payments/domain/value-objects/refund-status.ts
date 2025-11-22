import { DomainError } from '../../../../core/errors/domain.error';

// src/modules/payments/domain/value-objects/refund-status.ts
export enum RefundStatusType {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export class RefundStatus {
  private readonly _status: RefundStatusType;

  constructor(status: RefundStatusType) {
    if (!Object.values(RefundStatusType).includes(status)) {
      throw new DomainError(`Invalid refund status: ${status}`);
    }
    this._status = status;
  }

  get status(): RefundStatusType {
    return this._status;
  }

  isPending(): boolean {
    return this._status === RefundStatusType.PENDING;
  }

  isApproved(): boolean {
    return this._status === RefundStatusType.APPROVED;
  }

  isProcessing(): boolean {
    return this._status === RefundStatusType.PROCESSING;
  }

  isCompleted(): boolean {
    return this._status === RefundStatusType.COMPLETED;
  }

  isFailed(): boolean {
    return this._status === RefundStatusType.FAILED;
  }

  isRejected(): boolean {
    return this._status === RefundStatusType.REJECTED;
  }

  equals(other: RefundStatus): boolean {
    return this._status === other._status;
  }

  toString(): string {
    return this._status;
  }

  static from(value: string): RefundStatus {
    return new RefundStatus(value as RefundStatusType);
  }

  static pending(): RefundStatus {
    return new RefundStatus(RefundStatusType.PENDING);
  }
}
