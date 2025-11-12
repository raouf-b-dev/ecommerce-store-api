// src/shared/domain/value-objects/quantity.ts
import { Result } from '../../../core/domain/result';
import { DomainError } from '../../../core/errors/domain.error';
import { ErrorFactory } from '../../../core/errors/error.factory';

export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    const validationResult = this.validateProps(value);
    if (validationResult.isFailure) throw validationResult.error;

    this._value = value;
  }

  private validateProps(value: number): Result<void, DomainError> {
    if (!Number.isInteger(value)) {
      throw new DomainError('Quantity must be an integer');
    }
    if (value < 0) {
      throw new DomainError('Quantity cannot be negative');
    }

    return Result.success(undefined);
  }

  get value(): number {
    return this._value;
  }

  isZero(): boolean {
    return this._value === 0;
  }

  isPositive(): boolean {
    return this._value > 0;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this._value + other._value);
  }

  subtract(other: Quantity): Result<Quantity, DomainError> {
    const result = this._value - other._value;
    if (result < 0) {
      return ErrorFactory.DomainError(
        'Cannot subtract: result would be negative',
      );
    }
    return Result.success(new Quantity(result));
  }

  isGreaterThan(other: Quantity): boolean {
    return this._value > other._value;
  }

  isGreaterThanOrEqual(other: Quantity): boolean {
    return this._value >= other._value;
  }

  isLessThan(other: Quantity): boolean {
    return this._value < other._value;
  }

  isLessThanOrEqual(other: Quantity): boolean {
    return this._value <= other._value;
  }

  equals(other: Quantity): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }

  static from(value: number): Quantity {
    return new Quantity(value);
  }

  static zero(): Quantity {
    return new Quantity(0);
  }
}
