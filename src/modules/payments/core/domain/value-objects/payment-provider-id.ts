import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';

const PROVIDER_ID_PATTERN = '^[a-z0-9]+(?:-[a-z0-9]+)*$';
const PROVIDER_ID_REGEX = new RegExp(PROVIDER_ID_PATTERN);

export class PaymentProviderId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: unknown): Result<PaymentProviderId, DomainError> {
    if (typeof value !== 'string') {
      return ErrorFactory.DomainError('Payment provider ID must be a string');
    }

    if (!value) {
      return ErrorFactory.DomainError('Payment provider ID cannot be empty');
    }

    if (!PROVIDER_ID_REGEX.test(value)) {
      return ErrorFactory.DomainError(
        `Invalid payment provider ID format: '${value}'`,
      );
    }

    return Result.success(new PaymentProviderId(value));
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
