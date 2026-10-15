import { PaymentProviderId } from '../../core/domain/value-objects/payment-provider-id';

const providerIdResult = PaymentProviderId.create('stripe');
if (providerIdResult.isFailure) {
  throw providerIdResult.error;
}

export const STRIPE_PAYMENT_PROVIDER_ID: PaymentProviderId =
  providerIdResult.value;
