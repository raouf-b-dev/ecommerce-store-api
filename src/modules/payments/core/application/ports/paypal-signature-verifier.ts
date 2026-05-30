export interface PayPalWebhookPayload {
  event_type: string;
  resource: {
    id: string;
    status_details?: {
      reason: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}

export abstract class PayPalSignatureVerifier {
  abstract verify(
    headers: Record<string, string>,
    body: PayPalWebhookPayload,
  ): boolean;
}
