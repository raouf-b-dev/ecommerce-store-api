// src/modules/payments/infrastructure/gateways/payment-gateway.factory.ts
import { Injectable } from '@nestjs/common';
import { IPaymentGateway } from '../../core/domain/gateways/payment-gateway.interface';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { StripeGateway } from './stripe.gateway';

@Injectable()
export class PaymentGatewayFactory {
  private readonly gateways: Map<PaymentMethodType, IPaymentGateway>;

  constructor(private readonly stripeGateway: StripeGateway) {
    this.gateways = new Map<PaymentMethodType, IPaymentGateway>([
      [PaymentMethodType.STRIPE, stripeGateway],
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
