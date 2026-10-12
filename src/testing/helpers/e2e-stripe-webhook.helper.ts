import { HttpStatus } from '@nestjs/common';
import Stripe from 'stripe';
import { E2E_API_PREFIX } from './auth-test.helper';
import {
  E2eHttpClient,
  E2E_STRIPE_WEBHOOK_SECRET,
} from './e2e-test-app.helper';

export interface PostSignedWebhookOptions {
  secret?: string;
  signature?: string;
  timestamp?: number;
}

export class E2eStripeWebhookHelper {
  static async postSignedWebhook(
    http: E2eHttpClient,
    rawBody: string,
    options?: PostSignedWebhookOptions,
  ): Promise<{ status: number; body: unknown }> {
    const secret =
      options?.secret ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      E2E_STRIPE_WEBHOOK_SECRET;

    const signature =
      options?.signature ??
      Stripe.webhooks.generateTestHeaderString({
        payload: rawBody,
        secret,
        ...(options?.timestamp !== undefined
          ? { timestamp: options.timestamp }
          : {}),
      });

    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(rawBody);

    return { status: response.status, body: response.body };
  }

  static async postStripeWebhook(
    http: E2eHttpClient,
    options: {
      paymentIntentId: string;
      eventType: string;
      metadata?: Record<string, string>;
      failureMessage?: string;
      amountMinor?: number;
      currency?: string;
    },
  ): Promise<{ status: number; body: unknown }> {
    const payload = {
      id: `evt_${Date.now()}`,
      object: 'event',
      type: options.eventType,
      data: {
        object: {
          id: options.paymentIntentId,
          amount_received: options.amountMinor,
          currency: options.currency,
          metadata: options.metadata ?? {},
          last_payment_error:
            options.eventType === 'payment_intent.payment_failed'
              ? {
                  message: options.failureMessage ?? 'Card declined',
                }
              : undefined,
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    return await this.postSignedWebhook(http, rawBody);
  }

  static async postAndExpectOk(
    http: E2eHttpClient,
    options: {
      paymentIntentId: string;
      eventType: string;
      metadata?: Record<string, string>;
      failureMessage?: string;
      amountMinor?: number;
      currency?: string;
    },
  ): Promise<void> {
    const response = await this.postStripeWebhook(http, options);
    expect(response.status).toBe(HttpStatus.OK);
  }
}
