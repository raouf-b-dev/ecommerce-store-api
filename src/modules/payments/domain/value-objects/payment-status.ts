import { DomainError } from '../../../../core/errors/domain.error';

// src/modules/payments/domain/value-objects/payment-status.ts
export enum PaymentStatusType {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
  NOT_REQUIRED_YET = 'NOT_REQUIRED_YET', // For COD
}

export class PaymentStatus {
  private readonly _status: PaymentStatusType;

  constructor(status: PaymentStatusType) {
    if (!Object.values(PaymentStatusType).includes(status)) {
      throw new DomainError(`Invalid payment status: ${status}`);
    }
    this._status = status;
  }

  get status(): PaymentStatusType {
    return this._status;
  }

  isPending(): boolean {
    return this._status === PaymentStatusType.PENDING;
  }

  isAuthorized(): boolean {
    return this._status === PaymentStatusType.AUTHORIZED;
  }

  isCaptured(): boolean {
    return this._status === PaymentStatusType.CAPTURED;
  }

  isCompleted(): boolean {
    return this._status === PaymentStatusType.COMPLETED;
  }

  isFailed(): boolean {
    return this._status === PaymentStatusType.FAILED;
  }

  isRefunded(): boolean {
    return [
      PaymentStatusType.REFUNDED,
      PaymentStatusType.PARTIALLY_REFUNDED,
    ].includes(this._status);
  }

  isCancelled(): boolean {
    return this._status === PaymentStatusType.CANCELLED;
  }

  isNotRequiredYet(): boolean {
    return this._status === PaymentStatusType.NOT_REQUIRED_YET;
  }

  isSuccessful(): boolean {
    return [PaymentStatusType.CAPTURED, PaymentStatusType.COMPLETED].includes(
      this._status,
    );
  }

  canBeRefunded(): boolean {
    return [PaymentStatusType.CAPTURED, PaymentStatusType.COMPLETED].includes(
      this._status,
    );
  }

  equals(other: PaymentStatus): boolean {
    return this._status === other._status;
  }

  toString(): string {
    return this._status;
  }

  static from(value: string): PaymentStatus {
    return new PaymentStatus(value as PaymentStatusType);
  }

  static pending(): PaymentStatus {
    return new PaymentStatus(PaymentStatusType.PENDING);
  }

  static completed(): PaymentStatus {
    return new PaymentStatus(PaymentStatusType.COMPLETED);
  }

  static failed(): PaymentStatus {
    return new PaymentStatus(PaymentStatusType.FAILED);
  }

  static refunded(): PaymentStatus {
    return new PaymentStatus(PaymentStatusType.REFUNDED);
  }

  static notRequiredYet(): PaymentStatus {
    return new PaymentStatus(PaymentStatusType.NOT_REQUIRED_YET);
  }
}
