import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';

export class PaymentProviderId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: unknown): Result<PaymentProviderId, DomainError> {
    if (typeof value !== 'string') {
      return ErrorFactory.DomainError('Payment provider ID must be a string');
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return ErrorFactory.DomainError('Payment provider ID cannot be empty');
    }

    if (!/^[a-z0-9_-]+$/.test(trimmed)) {
      return ErrorFactory.DomainError(
        `Invalid payment provider ID format: '${trimmed}'`,
      );
    }

    return Result.success(new PaymentProviderId(trimmed));
  }

  get value(): string {
    return this._value;
  }

  equals(other: PaymentProviderId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
