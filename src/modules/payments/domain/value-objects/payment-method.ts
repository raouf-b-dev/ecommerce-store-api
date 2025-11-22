import { DomainError } from '../../../../core/errors/domain.error';

// src/modules/payments/domain/value-objects/payment-method.ts
export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
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

  isCardPayment(): boolean {
    return [
      PaymentMethodType.CREDIT_CARD,
      PaymentMethodType.DEBIT_CARD,
    ].includes(this._type);
  }

  isCOD(): boolean {
    return this._type === PaymentMethodType.CASH_ON_DELIVERY;
  }

  requiresGateway(): boolean {
    return [
      PaymentMethodType.STRIPE,
      PaymentMethodType.PAYPAL,
      PaymentMethodType.CREDIT_CARD,
      PaymentMethodType.DEBIT_CARD,
      PaymentMethodType.BANK_TRANSFER,
    ].includes(this._type);
  }

  equals(other: PaymentMethod): boolean {
    return this._type === other._type;
  }

  toString(): string {
    return this._type;
  }

  static from(value: string): PaymentMethod {
    return new PaymentMethod(value as PaymentMethodType);
  }
}
