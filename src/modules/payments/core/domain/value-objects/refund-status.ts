// src/modules/payments/core/domain/value-objects/refund-status.ts
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';

export enum RefundStatusType {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

const VALID_REFUND_STATUS_TYPES = new Set<unknown>(
  Object.values(RefundStatusType),
);

export function isRefundStatusType(value: unknown): value is RefundStatusType {
  return VALID_REFUND_STATUS_TYPES.has(value);
}

export class RefundStatus {
  private readonly _status: RefundStatusType;

  constructor(status: string) {
    if (!isRefundStatusType(status)) {
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
    return new RefundStatus(value);
  }

  static pending(): RefundStatus {
    return new RefundStatus(RefundStatusType.PENDING);
  }
}
