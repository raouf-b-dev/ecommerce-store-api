// src/modules/customers/domain/value-objects/email.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/errors/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';

export class Email {
  private readonly _value: string;

  constructor(value: string) {
    const validationResult = this.validateEmail(value);
    if (validationResult.isFailure) throw validationResult.error;

    this._value = value.trim().toLowerCase();
  }

  private validateEmail(email: string): Result<void, DomainError> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email?.trim()) {
      return ErrorFactory.DomainError('Email is required');
    }

    if (!emailRegex.test(email)) {
      return ErrorFactory.DomainError('Invalid email format');
    }

    return Result.success(undefined);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static from(value: string): Email {
    return new Email(value);
  }
}
