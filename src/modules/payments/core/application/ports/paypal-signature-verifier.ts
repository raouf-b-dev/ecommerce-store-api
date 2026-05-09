import { PayPalWebhookPayload } from '../usecases/handle-paypal-webhook/handle-paypal-webhook.usecase';

export abstract class PayPalSignatureVerifier {
  abstract verify(
    headers: Record<string, string>,
    body: PayPalWebhookPayload,
  ): boolean;
}
