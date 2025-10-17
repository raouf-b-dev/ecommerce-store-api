// src/modules/orders/domain/value-objects/payment-method.ts
export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CREDIT_CARD = 'credit_card',
}

export enum PaymentTiming {
  BEFORE_FULFILLMENT = 'before_fulfillment',
  ON_DELIVERY = 'on_delivery',
}

export class PaymentMethodVO {
  private readonly _method: PaymentMethod;

  constructor(method: string | PaymentMethod) {
    if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
      throw new Error(`Invalid payment method: ${method}`);
    }
    this._method = method as PaymentMethod;
  }

  get value(): PaymentMethod {
    return this._method;
  }

  isCashOnDelivery(): boolean {
    return this._method === PaymentMethod.CASH_ON_DELIVERY;
  }

  isOnlinePayment(): boolean {
    return !this.isCashOnDelivery();
  }

  isStripe(): boolean {
    return this._method === PaymentMethod.STRIPE;
  }

  isPayPal(): boolean {
    return this._method === PaymentMethod.PAYPAL;
  }

  isCreditCard(): boolean {
    return this._method === PaymentMethod.CREDIT_CARD;
  }

  /**
   * Critical: Determines when payment should be collected
   */
  getPaymentTiming(): PaymentTiming {
    if (this.isCashOnDelivery()) {
      return PaymentTiming.ON_DELIVERY;
    }
    return PaymentTiming.BEFORE_FULFILLMENT;
  }

  /**
   * Payment must be completed before order can be confirmed
   */
  requiresPaymentBeforeConfirmation(): boolean {
    return this.getPaymentTiming() === PaymentTiming.BEFORE_FULFILLMENT;
  }

  /**
   * Payment happens during delivery
   */
  requiresPaymentOnDelivery(): boolean {
    return this.getPaymentTiming() === PaymentTiming.ON_DELIVERY;
  }

  allowsManualConfirmation(): boolean {
    return this.isCashOnDelivery();
  }

  supportsRefunds(): boolean {
    return this.isOnlinePayment();
  }

  getDisplayName(): string {
    const displayNames: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH_ON_DELIVERY]: 'Cash on Delivery',
      [PaymentMethod.STRIPE]: 'Credit Card (Stripe)',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.CREDIT_CARD]: 'Credit Card',
    };

    return displayNames[this._method];
  }

  getProcessingFee(amount: number): number {
    const feeRates: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH_ON_DELIVERY]: 0,
      [PaymentMethod.STRIPE]: 0.029,
      [PaymentMethod.PAYPAL]: 0.0349,
      [PaymentMethod.CREDIT_CARD]: 0.025,
    };

    const rate = feeRates[this._method];
    return Math.round(amount * rate * 100) / 100;
  }

  equals(other: PaymentMethodVO): boolean {
    return this._method === other._method;
  }

  toString(): string {
    return this._method;
  }

  static cashOnDelivery(): PaymentMethodVO {
    return new PaymentMethodVO(PaymentMethod.CASH_ON_DELIVERY);
  }

  static stripe(): PaymentMethodVO {
    return new PaymentMethodVO(PaymentMethod.STRIPE);
  }

  static paypal(): PaymentMethodVO {
    return new PaymentMethodVO(PaymentMethod.PAYPAL);
  }

  static creditCard(): PaymentMethodVO {
    return new PaymentMethodVO(PaymentMethod.CREDIT_CARD);
  }

  static fromString(method: string): PaymentMethodVO {
    return new PaymentMethodVO(method);
  }
}
