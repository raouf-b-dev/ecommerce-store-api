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

  multiply(quantity: number): Money {
    if (quantity < 0) {
      throw new Error('Cannot multiply money by negative quantity');
    }
    return new Money(this._value * quantity);
  }

  equals(other: Money): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toFixed(2);
  }

  static zero(): Money {
    return new Money(0);
  }

  static from(value: number): Money {
    return new Money(value);
  }
}
