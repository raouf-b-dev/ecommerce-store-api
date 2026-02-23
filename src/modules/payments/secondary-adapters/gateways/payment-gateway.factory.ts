// src/modules/payments/infrastructure/gateways/payment-gateway.factory.ts
import { Injectable } from '@nestjs/common';
import { IPaymentGateway } from '../../core/domain/gateways/payment-gateway.interface';
import { PaymentMethodType } from '../../core/domain/value-objects/payment-method';
import { CodGateway } from './cod.gateway';
import { StripeGateway } from './stripe.gateway';
import { PayPalGateway } from './paypal.gateway';

@Injectable()
export class PaymentGatewayFactory {
  private readonly gateways: Map<PaymentMethodType, IPaymentGateway>;

  constructor(
    private readonly codGateway: CodGateway,
    private readonly stripeGateway: StripeGateway,
    private readonly payPalGateway: PayPalGateway,
  ) {
    this.gateways = new Map<PaymentMethodType, IPaymentGateway>([
      [PaymentMethodType.CASH_ON_DELIVERY, codGateway],
      [PaymentMethodType.STRIPE, stripeGateway],
      [PaymentMethodType.PAYPAL, payPalGateway],
      [PaymentMethodType.CREDIT_CARD, stripeGateway], // Default CC to Stripe
      [PaymentMethodType.DEBIT_CARD, stripeGateway], // Default DC to Stripe
    ]);
  }

  getGateway(method: PaymentMethodType): IPaymentGateway {
    const gateway = this.gateways.get(method);
    if (!gateway) {
      throw new Error(`Unsupported payment method: ${method}`);
    }
    return gateway;
  }
}
