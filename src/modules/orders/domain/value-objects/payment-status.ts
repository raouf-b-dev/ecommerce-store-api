// src/modules/orders/domain/value-objects/payment-status.ts
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NOT_REQUIRED_YET = 'not_required_yet',
}

export class PaymentStatusVO {
  private readonly _status: PaymentStatus;

  constructor(status: string | PaymentStatus) {
    if (!Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      throw new Error(`Invalid payment status: ${status}`);
    }
    this._status = status as PaymentStatus;
  }

  get value(): PaymentStatus {
    return this._status;
  }

  isPending(): boolean {
    return this._status === PaymentStatus.PENDING;
  }

  isCompleted(): boolean {
    return this._status === PaymentStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this._status === PaymentStatus.FAILED;
  }

  isNotRequiredYet(): boolean {
    return this._status === PaymentStatus.NOT_REQUIRED_YET;
  }

  canTransitionTo(newStatus: PaymentStatus): boolean {
    const transitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
      [PaymentStatus.COMPLETED]: [],
      [PaymentStatus.FAILED]: [PaymentStatus.PENDING],
      [PaymentStatus.NOT_REQUIRED_YET]: [
        PaymentStatus.PENDING,
        PaymentStatus.COMPLETED,
      ],
    };

    return transitions[this._status].includes(newStatus);
  }

  equals(other: PaymentStatusVO): boolean {
    return this._status === other._status;
  }

  toString(): string {
    return this._status;
  }

  static pending(): PaymentStatusVO {
    return new PaymentStatusVO(PaymentStatus.PENDING);
  }

  static completed(): PaymentStatusVO {
    return new PaymentStatusVO(PaymentStatus.COMPLETED);
  }

  static failed(): PaymentStatusVO {
    return new PaymentStatusVO(PaymentStatus.FAILED);
  }

  static notRequiredYet(): PaymentStatusVO {
    return new PaymentStatusVO(PaymentStatus.NOT_REQUIRED_YET);
  }
}
