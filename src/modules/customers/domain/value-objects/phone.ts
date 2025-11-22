// src/modules/customers/domain/value-objects/phone.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';

export class Phone {
  private readonly _value: string;

  constructor(value: string) {
    const validationResult = this.validatePhone(value);
    if (validationResult.isFailure) throw validationResult.error;

    this._value = value.trim();
  }

  private validatePhone(phone: string): Result<void, DomainError> {
    if (!phone?.trim()) {
      return ErrorFactory.DomainError('Phone number is required');
    }

    // Basic phone validation: at least 7 digits/characters
    const phoneRegex = /^[+]?[0-9]{7,}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-()]/g, ''))) {
      return ErrorFactory.DomainError(
        'Phone number must contain at least 7 digits',
      );
    }

    return Result.success(undefined);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Phone): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static from(value: string): Phone {
    return new Phone(value);
  }
}
