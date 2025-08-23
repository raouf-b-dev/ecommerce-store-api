// src/modules/orders/domain/value-objects/quantity.ts
export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be an integer');
    }
    if (value <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
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
}
