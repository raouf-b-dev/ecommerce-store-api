import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import {
  StripeSignatureVerifier,
  StripeWebhookPayload,
} from '../../core/application/ports/stripe-signature-verifier';
import { EnvConfigService } from '../../../../config/env-config.service';

export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

@Injectable()
export class StripeSignatureService implements StripeSignatureVerifier {
  constructor(private readonly envConfigService: EnvConfigService) {}

  verify(rawBody: Buffer, signature: string): StripeWebhookPayload | null {
    if (!signature?.trim() || !rawBody || rawBody.length === 0) {
      return null;
    }

    const secret = this.envConfigService.payments.stripeWebhookSecret;
    if (!secret?.trim()) {
      return null;
    }

    const timestamp = this.parseTimestampFromHeader(signature);
    if (timestamp === null) {
      return null;
    }

    // stripe-node only rejects stale timestamps; also reject far-future ones
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (timestamp - nowSeconds > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
      return null;
    }

    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(
        rawBody,
        signature,
        secret,
        STRIPE_SIGNATURE_TOLERANCE_SECONDS,
      );
    } catch {
      return null;
    }

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const paymentIntent = event.data.object;
      return {
        type: event.type,
        data: {
          object: {
            id: paymentIntent.id,
            metadata: paymentIntent.metadata,
            amount: paymentIntent.amount,
            amount_received: paymentIntent.amount_received,
            currency: paymentIntent.currency,
            ...(paymentIntent.last_payment_error?.message
              ? {
                  last_payment_error: {
                    message: paymentIntent.last_payment_error.message,
                  },
                }
              : {}),
          },
        },
      };
    }

    return {
      type: event.type,
      data: {
        object: {
          id: '',
          metadata: {},
        },
      },
    };
  }

  private parseTimestampFromHeader(header: string): number | null {
    const parts = header.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('t=')) {
        const rawTs = trimmed.slice(2).trim();
        const parsed = Number(rawTs);
        if (Number.isInteger(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }
}
