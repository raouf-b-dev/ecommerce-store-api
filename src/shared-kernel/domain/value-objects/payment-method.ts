// shared-kernel/domain/value-objects/payment-method.ts
// Both the enum and the value object class live in shared-kernel because
// both Orders and Payments contexts depend on them.

import { DomainError } from '../exceptions/domain.error';

export enum PaymentMethodType {
  CARD = 'CARD',
}

const VALID_PAYMENT_METHOD_TYPES = new Set<unknown>(
  Object.values(PaymentMethodType),
);

export function isPaymentMethodType(
  value: unknown,
): value is PaymentMethodType {
  return VALID_PAYMENT_METHOD_TYPES.has(value);
}

export class PaymentMethod {
  private readonly _type: PaymentMethodType;

  constructor(type: string) {
    if (!isPaymentMethodType(type)) {
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
