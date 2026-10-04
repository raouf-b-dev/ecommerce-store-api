import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import {
  StripeSignatureVerifier,
  StripeWebhookPayload,
} from '../../core/application/ports/stripe-signature-verifier';
import { EnvConfigService } from '../../../../config/env-config.service';

export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractMetadata(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      result[k] = v;
    }
  }
  return result;
}

function extractLastPaymentError(
  value: unknown,
): { message: string } | undefined {
  if (isRecord(value) && typeof value['message'] === 'string') {
    return { message: value['message'] };
  }
  return undefined;
}

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

    const obj = event.data?.object;
    if (!isRecord(obj)) {
      return null;
    }

    const id = typeof obj['id'] === 'string' ? obj['id'] : '';
    const metadata = extractMetadata(obj['metadata']);
    const amount =
      typeof obj['amount'] === 'number' ? obj['amount'] : undefined;
    const amountReceived =
      typeof obj['amount_received'] === 'number'
        ? obj['amount_received']
        : undefined;
    const currency =
      typeof obj['currency'] === 'string' ? obj['currency'] : undefined;
    const lastPaymentError = extractLastPaymentError(obj['last_payment_error']);

    return {
      type: event.type,
      data: {
        object: {
          id,
          metadata,
          ...(amount !== undefined ? { amount } : {}),
          ...(amountReceived !== undefined
            ? { amount_received: amountReceived }
            : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(lastPaymentError ? { last_payment_error: lastPaymentError } : {}),
        },
      },
    };
  }

  private parseTimestampFromHeader(header: string): number | null {
    const parts = header.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('t=')) {
        const rawTs = trimmed.slice(2);
        const parsed = parseInt(rawTs, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }
}
