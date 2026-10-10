// shared-kernel/domain/value-objects/payment-method.ts
// Both the enum and the value object class live in shared-kernel because
// both Orders and Payments contexts depend on them.

import { DomainError } from '../exceptions/domain.error';

export enum PaymentMethodType {
  CARD = 'CARD',
}

export class PaymentMethod {
  private readonly _type: PaymentMethodType;

  constructor(type: PaymentMethodType) {
    if (!Object.values(PaymentMethodType).includes(type)) {
      throw new DomainError(`Invalid payment method: ${type}`);
    }
    this._type = type;
  }

  get type(): PaymentMethodType {
    return this._type;
  }

  equals(other: PaymentMethod): boolean {
    return this._type === other._type;
  }

  toString(): string {
    return this._type;
  }
}
