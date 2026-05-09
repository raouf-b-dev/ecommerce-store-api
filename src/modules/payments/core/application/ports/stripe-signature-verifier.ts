import { StripeWebhookPayload } from '../usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';

export abstract class StripeSignatureVerifier {
  abstract verify(payload: StripeWebhookPayload, signature: string): boolean;
}
