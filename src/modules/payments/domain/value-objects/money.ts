// src/modules/payments/domain/value-objects/money.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string) {
    const validationResult = this.validateProps(amount, currency);
    if (validationResult.isFailure) throw validationResult.error;

    this._amount = this.roundAmount(amount);
    this._currency = currency.trim().toUpperCase();
  }

  private validateProps(
    amount: number,
    currency: string,
  ): Result<void, DomainError> {
    if (amount < 0) {
      return ErrorFactory.DomainError('Amount cannot be negative');
    }
    if (!currency?.trim()) {
      return ErrorFactory.DomainError('Currency is required');
    }
    if (currency.trim().length !== 3) {
      return ErrorFactory.DomainError(
        'Currency must be a 3-letter code (ISO 4217)',
      );
    }

    return Result.success(undefined);
  }

  private roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new DomainError(
        `Cannot add amounts in different currencies: ${this._currency} and ${other._currency}`,
      );
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Result<Money, DomainError> {
    if (this._currency !== other._currency) {
      return ErrorFactory.DomainError(
        `Cannot subtract amounts in different currencies: ${this._currency} and ${other._currency}`,
      );
    }

    const result = this._amount - other._amount;
    if (result < 0) {
      return ErrorFactory.DomainError(
        `Cannot subtract: result would be negative`,
      );
    }

    return Result.success(new Money(result, this._currency));
  }

  isGreaterThan(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new DomainError('Cannot compare amounts in different currencies');
    }
    return this._amount > other._amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new DomainError('Cannot compare amounts in different currencies');
    }
    return this._amount >= other._amount;
  }

  isLessThan(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new DomainError('Cannot compare amounts in different currencies');
    }
    return this._amount < other._amount;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }

  static from(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  static zero(currency: string): Money {
    return new Money(0, currency);
  }
}
