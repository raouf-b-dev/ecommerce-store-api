// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface StripeWebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      metadata: Record<string, string>;
      last_payment_error?: {
        message: string;
      };
    };
  };
}

export abstract class StripeSignatureVerifier {
  abstract verify(payload: StripeWebhookPayload, signature: string): boolean;
}
