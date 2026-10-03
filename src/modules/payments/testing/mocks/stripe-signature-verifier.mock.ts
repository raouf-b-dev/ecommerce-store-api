import {
  StripeSignatureVerifier,
  StripeWebhookPayload,
} from '../../core/application/ports/stripe-signature-verifier';

export class MockStripeSignatureVerifier implements StripeSignatureVerifier {
  verify = jest
    .fn<boolean, [StripeWebhookPayload, string]>()
    .mockReturnValue(true);

  mockValidSignature(): void {
    this.verify.mockReturnValue(true);
  }

  mockInvalidSignature(): void {
    this.verify.mockReturnValue(false);
  }

  reset(): void {
    jest.clearAllMocks();
    this.mockValidSignature();
  }
}
