export interface StripeWebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      metadata: Record<string, string>;
      amount?: number;
      amount_received?: number;
      currency?: string;
      last_payment_error?: {
        message: string;
      };
    };
  };
}

export abstract class StripeSignatureVerifier {
  abstract verify(payload: StripeWebhookPayload, signature: string): boolean;
}
