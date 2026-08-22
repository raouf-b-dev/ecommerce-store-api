import { HttpStatus } from '@nestjs/common';
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
      .set('stripe-signature', 'e2e-test')
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
