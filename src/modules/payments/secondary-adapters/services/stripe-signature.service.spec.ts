import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE,
  StripeSignatureService,
} from './stripe-signature.service';

describe('StripeSignatureService', () => {
  const payload = { type: 'payment_intent.succeeded', data: { object: {} } };

  function createService(
    nodeEnv: string,
    webhookSecret?: string,
  ): StripeSignatureService {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') {
          return nodeEnv;
        }
        if (key === 'STRIPE_WEBHOOK_SECRET') {
          return webhookSecret;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    return new StripeSignatureService(config);
  }

  it('rejects missing signature', () => {
    const service = createService('production', 'whsec_test');
    expect(service.verify(payload, '')).toBe(false);
  });

  it('accepts the documented e2e bypass only when NODE_ENV=test', () => {
    const testService = createService('test');
    expect(
      testService.verify(payload, STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE),
    ).toBe(true);

    const prodService = createService('production');
    expect(
      prodService.verify(payload, STRIPE_WEBHOOK_E2E_BYPASS_SIGNATURE),
    ).toBe(false);
  });

  it('rejects invalid signatures when no secret is configured outside test bypass', () => {
    const service = createService('development');
    expect(service.verify(payload, 'forged-signature')).toBe(false);
  });

  it('rejects invalid signatures when a secret is configured', () => {
    const service = createService('production', 'whsec_test');
    expect(service.verify(payload, 't=123,v1=deadbeef')).toBe(false);
  });

  it('accepts a valid Stripe-style signature when secret is configured', () => {
    const secret = 'whsec_test';
    const timestamp = '1710000000';
    const rawPayload = JSON.stringify(payload);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawPayload}`, 'utf8')
      .digest('hex');

    const service = createService('production', secret);
    expect(service.verify(payload, `t=${timestamp},v1=${signature}`)).toBe(
      true,
    );
  });
});
