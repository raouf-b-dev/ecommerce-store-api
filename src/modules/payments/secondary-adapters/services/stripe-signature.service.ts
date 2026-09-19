import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/** Documented test-only bypass for e2e when NODE_ENV=test. Not valid in production. */
export const STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE = 'e2e-test';

@Injectable()
export class StripeSignatureService {
  constructor(private readonly configService: ConfigService) {}

  verify(payload: Record<string, unknown>, signature: string): boolean {
    if (!signature?.trim()) {
      return false;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';

    if (
      nodeEnv === 'test' &&
      signature === STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE
    ) {
      return true;
    }

    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret?.trim()) {
      return false;
    }

    const rawPayload = JSON.stringify(payload);
    return this.verifyStripeSignature(rawPayload, signature, secret);
  }

  private verifyStripeSignature(
    rawPayload: string,
    signatureHeader: string,
    secret: string,
  ): boolean {
    const parts = signatureHeader.split(',').map((part) => part.trim());
    const timestampPart = parts.find((part) => part.startsWith('t='));
    const signaturePart = parts.find((part) => part.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = timestampPart.slice(2);
    const expectedSignature = signaturePart.slice(3);
    if (!timestamp || !expectedSignature) {
      return false;
    }

    const signedPayload = `${timestamp}.${rawPayload}`;
    const computed = createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(computed, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      );
    } catch {
      return false;
    }
  }
}
