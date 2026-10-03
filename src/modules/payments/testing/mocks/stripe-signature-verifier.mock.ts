import {
  StripeSignatureVerifier,
  StripeWebhookPayload,
} from '../../core/application/ports/stripe-signature-verifier';

export class MockStripeSignatureVerifier implements StripeSignatureVerifier {
  verify = jest
    .fn<boolean, [StripeWebhookPayload, string]>()
    .mockReturnValue(true);

  reset(): void {
    jest.clearAllMocks();
    this.verify.mockReturnValue(true);
  }
}
