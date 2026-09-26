// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { HttpStatus } from '@nestjs/common';
import { STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE } from 'src/modules/payments/secondary-adapters/services/stripe-signature.service';
import { E2E_API_PREFIX } from './auth-test.helper';
import { E2eHttpClient } from './e2e-test-app.helper';

export class E2eStripeWebhookHelper {
  static async postStripeWebhook(
    http: E2eHttpClient,
    options: {
      paymentIntentId: string;
      eventType: string;
      metadata?: Record<string, string>;
      failureMessage?: string;
    },
  ): Promise<{ status: number; body: unknown }> {
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('stripe-signature', STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE)
      .send({
        type: options.eventType,
        data: {
          object: {
            id: options.paymentIntentId,
            metadata: options.metadata ?? {},
            last_payment_error:
              options.eventType === 'payment_intent.payment_failed'
                ? {
                    message: options.failureMessage ?? 'Card declined',
                  }
                : undefined,
          },
        },
      });

    return { status: response.status, body: response.body };
  }

  static async postAndExpectOk(
    http: E2eHttpClient,
    options: {
      paymentIntentId: string;
      eventType: string;
      metadata?: Record<string, string>;
      failureMessage?: string;
    },
  ): Promise<void> {
    const response = await this.postStripeWebhook(http, options);
    expect(response.status).toBe(HttpStatus.OK);
  }
}
