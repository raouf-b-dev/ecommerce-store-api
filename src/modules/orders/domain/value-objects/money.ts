// src/modules/orders/domain/value-objects/money.ts
export class Money {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0) {
      throw new Error('Money cannot be negative');
    }
    if (!Number.isFinite(value)) {
      throw new Error('Money must be a finite number');
    }
    // Round to 2 decimal places to avoid floating point issues
    this._value = Math.round(value * 100) / 100;
  }

  get value(): number {
    return this._value;
  }

  add(other: Money): Money {
    return new Money(this._value + other._value);
  }

  subtract(other: Money): Money {
    const result = this._value - other._value;
    if (result < 0) {
      throw new Error('Cannot subtract more money than available');
    }
    return new Money(result);
  }

  multiply(quantity: number): Money {
    if (quantity < 0) {
      throw new Error('Cannot multiply money by negative quantity');
    }
    return new Money(this._value * quantity);
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Cannot divide by zero or negative number');
    }
    return new Money(this._value / divisor);
  }

  // Comparison methods
  equals(other: Money): boolean {
    return this._value === other._value;
  }

  greaterThan(other: Money): boolean {
    return this._value > other._value;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this._value >= other._value;
  }

  lessThan(other: Money): boolean {
    return this._value < other._value;
  }

  lessThanOrEqual(other: Money): boolean {
    return this._value <= other._value;
  }

  isZero(): boolean {
    return this._value === 0;
  }

  isPositive(): boolean {
    return this._value > 0;
  }

  // Formatting methods
  toString(): string {
    return this._value.toFixed(2);
  }

  toCurrency(currencySymbol: string = '$'): string {
    return `${currencySymbol}${this.toString()}`;
  }

  // Static factory methods
  static zero(): Money {
    return new Money(0);
  }

  static from(value: number): Money {
    return new Money(value);
  }

  static fromNumber(value: number): Money {
    return new Money(value);
  }

  static fromCents(cents: number): Money {
    return new Money(cents / 100);
  }

  // Utility methods for calculations
  static sum(amounts: Money[]): Money {
    return amounts.reduce((total, amount) => total.add(amount), Money.zero());
  }

  static max(a: Money, b: Money): Money {
    return a.greaterThan(b) ? a : b;
  }

  static min(a: Money, b: Money): Money {
    return a.lessThan(b) ? a : b;
  }
}
