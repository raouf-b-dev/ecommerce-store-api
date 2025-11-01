// src/shared/domain/value-objects/quantity.ts
export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be an integer');
    }
    if (value < 0) {
      throw new Error('Quantity cannot be negative');
    }
    this._value = value;
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

  subtract(other: Quantity): Quantity {
    const result = this._value - other._value;
    if (result < 0) {
      throw new Error('Cannot subtract: result would be negative');
    }
    return new Quantity(result);
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
