import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../../core/application/ports/payment-provider';
import { PaymentProviderResolver } from '../../core/application/ports/payment-provider-resolver';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { FakeStripeGateway } from './fake-stripe.gateway';

@Injectable()
export class PaymentProviderRegistry implements PaymentProviderResolver {
  private readonly providers: Map<PaymentMethodType, PaymentProvider>;

  constructor(private readonly fakeStripeGateway: FakeStripeGateway) {
    this.providers = new Map<PaymentMethodType, PaymentProvider>([
      [PaymentMethodType.STRIPE, fakeStripeGateway],
    ]);
  }

  getProvider(method: PaymentMethodType): PaymentProvider {
    const provider = this.providers.get(method);
    if (!provider) {
      throw new Error(`Unsupported payment method: ${method}`);
    }
    return provider;
  }
}
