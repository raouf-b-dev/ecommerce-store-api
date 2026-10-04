import {
  StripeSignatureVerifier,
  StripeWebhookPayload,
} from '../../core/application/ports/stripe-signature-verifier';

export class MockStripeSignatureVerifier implements StripeSignatureVerifier {
  verify = jest
    .fn<StripeWebhookPayload | null, [Buffer, string]>()
    .mockReturnValue(null);

  mockSuccessfulVerification(payload: StripeWebhookPayload): void {
    this.verify.mockReturnValue(payload);
  }

  mockFailedVerification(): void {
    this.verify.mockReturnValue(null);
  }

  reset(): void {
    jest.clearAllMocks();
    this.verify.mockReturnValue(null);
  }
}
