// src/shared/domain/value-objects/money.ts
import { Result } from '../../../shared-kernel/domain/result';
import { DomainError } from '../../../shared-kernel/errors/domain.error';
import { ErrorFactory } from '../../../shared-kernel/errors/error.factory';

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string = 'USD') {
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
    if (!Number.isFinite(amount)) {
      return ErrorFactory.DomainError('Amount must be a finite number');
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

  // Alias for backward compatibility
  get value(): number {
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
        'Cannot subtract: result would be negative',
      );
    }

    return Result.success(new Money(result, this._currency));
  }

  multiply(quantity: number): Money {
    if (quantity < 0) {
      throw new DomainError('Cannot multiply money by negative quantity');
    }
    return new Money(this._amount * quantity, this._currency);
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new DomainError('Cannot divide by zero or negative number');
    }
    return new Money(this._amount / divisor, this._currency);
  }

  // Comparison methods
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  greaterThan(other: Money): boolean {
    this.checkCurrency(other);
    return this._amount > other._amount;
  }

  greaterThanOrEqual(other: Money): boolean {
    this.checkCurrency(other);
    return this._amount >= other._amount;
  }

  lessThan(other: Money): boolean {
    this.checkCurrency(other);
    return this._amount < other._amount;
  }

  lessThanOrEqual(other: Money): boolean {
    this.checkCurrency(other);
    return this._amount <= other._amount;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  isPositive(): boolean {
    return this._amount > 0;
  }

  // Aliases for payments module compatibility
  isGreaterThan(other: Money): boolean {
    return this.greaterThan(other);
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.greaterThanOrEqual(other);
  }

  isLessThan(other: Money): boolean {
    return this.lessThan(other);
  }

  private checkCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new DomainError('Cannot compare amounts in different currencies');
    }
  }

  // Formatting methods
  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }

  toCurrency(currencySymbol: string = '$'): string {
    return `${currencySymbol}${this._amount.toFixed(2)}`;
  }

  // Static factory methods
  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }

  static from(amount: number, currency: string = 'USD'): Money {
    return new Money(amount, currency);
  }

  static fromNumber(value: number, currency: string = 'USD'): Money {
    return new Money(value, currency);
  }

  static fromCents(cents: number, currency: string = 'USD'): Money {
    return new Money(cents / 100, currency);
  }

  // Utility methods for calculations
  static sum(amounts: Money[]): Money {
    if (amounts.length === 0) return Money.zero();
    const currency = amounts[0].currency;
    return amounts.reduce(
      (total, amount) => total.add(amount),
      Money.zero(currency),
    );
  }

  static max(a: Money, b: Money): Money {
    return a.greaterThan(b) ? a : b;
  }

  static min(a: Money, b: Money): Money {
    return a.lessThan(b) ? a : b;
  }
}
