import Stripe from 'stripe';
import { StripeSignatureService } from './stripe-signature.service';
import { MockEnvConfigService } from '../../../../testing/mocks/env-config.service.mock';
import { ClockTestHelper } from '../../../../testing/helpers/clock-test.helper';

describe('StripeSignatureService', () => {
  const secret = 'whsec_test_secret_for_unit_tests';
  const prettyJson = JSON.stringify(
    {
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 5000,
          amount_received: 5000,
          currency: 'usd',
          metadata: { orderId: '100' },
        },
      },
    },
    null,
    2,
  );
  const rawBody = Buffer.from(prettyJson, 'utf8');

  function createService(
    webhookSecret = secret,
    nodeEnv = 'test',
  ): StripeSignatureService {
    const mockConfig = new MockEnvConfigService();
    mockConfig.setMockConfig({
      node: { env: nodeEnv, port: 3000 },
      payments: {
        mockAutoComplete: false,
        stripeWebhookSecret: webhookSecret,
      },
    });
    return new StripeSignatureService(mockConfig);
  }

  it('accepts a signature over a pretty-printed raw body generated with generateTestHeaderString', () => {
    const service = createService(secret);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyJson,
      secret,
    });

    const result = service.verify(rawBody, signature);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('payment_intent.succeeded');
    expect(result?.data.object.id).toBe('pi_test123');
    expect(result?.data.object.amount).toBe(5000);
    expect(result?.data.object.amount_received).toBe(5000);
    expect(result?.data.object.currency).toBe('usd');
    expect(result?.data.object.metadata).toEqual({ orderId: '100' });
  });

  it('rejects re-serialized compact JSON of the same event when signed as pretty JSON', () => {
    const service = createService(secret);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyJson,
      secret,
    });
    const compactJson = JSON.stringify(JSON.parse(prettyJson));
    const compactBody = Buffer.from(compactJson, 'utf8');

    const result = service.verify(compactBody, signature);

    expect(result).toBeNull();
  });

  it('rejects a tampered body where one byte changed', () => {
    const service = createService(secret);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyJson,
      secret,
    });
    const tamperedBody = Buffer.from(prettyJson + ' ', 'utf8');

    const result = service.verify(tamperedBody, signature);

    expect(result).toBeNull();
  });

  it('rejects a signature created with the wrong secret', () => {
    const service = createService(secret);
    const wrongSecret = 'whsec_another_secret_that_does_not_match';
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyJson,
      secret: wrongSecret,
    });

    const result = service.verify(rawBody, signature);

    expect(result).toBeNull();
  });

  it('rejects empty, whitespace, or malformed signature headers', () => {
    const service = createService(secret);

    expect(service.verify(rawBody, '')).toBeNull();
    expect(service.verify(rawBody, '   ')).toBeNull();
    expect(service.verify(rawBody, 'forged-header-no-v1')).toBeNull();
    expect(service.verify(rawBody, 't=12345')).toBeNull();
  });

  it('rejects a stale timestamp outside the 300 second tolerance zone', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z');
    ClockTestHelper.useFixedDate(baseTime);

    try {
      const service = createService(secret);
      const nowSeconds = Math.floor(baseTime.getTime() / 1000);
      const staleSignature = Stripe.webhooks.generateTestHeaderString({
        payload: prettyJson,
        secret,
        timestamp: nowSeconds - 301,
      });

      const result = service.verify(rawBody, staleSignature);

      expect(result).toBeNull();
    } finally {
      ClockTestHelper.restore();
    }
  });

  it('rejects a far-future timestamp outside the 300 second tolerance zone', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z');
    ClockTestHelper.useFixedDate(baseTime);

    try {
      const service = createService(secret);
      const nowSeconds = Math.floor(baseTime.getTime() / 1000);
      const futureSignature = Stripe.webhooks.generateTestHeaderString({
        payload: prettyJson,
        secret,
        timestamp: nowSeconds + 301,
      });

      const result = service.verify(rawBody, futureSignature);

      expect(result).toBeNull();
    } finally {
      ClockTestHelper.restore();
    }
  });

  it('accepts signatures at the exact 300 second tolerance boundary (past and future)', () => {
    const baseTime = new Date('2026-10-04T12:00:00Z');
    ClockTestHelper.useFixedDate(baseTime);

    try {
      const service = createService(secret);
      const nowSeconds = Math.floor(baseTime.getTime() / 1000);

      const pastBoundarySignature = Stripe.webhooks.generateTestHeaderString({
        payload: prettyJson,
        secret,
        timestamp: nowSeconds - 300,
      });
      const pastResult = service.verify(rawBody, pastBoundarySignature);
      expect(pastResult).not.toBeNull();
      expect(pastResult?.type).toBe('payment_intent.succeeded');

      const futureBoundarySignature = Stripe.webhooks.generateTestHeaderString({
        payload: prettyJson,
        secret,
        timestamp: nowSeconds + 300,
      });
      const futureResult = service.verify(rawBody, futureBoundarySignature);
      expect(futureResult).not.toBeNull();
      expect(futureResult?.type).toBe('payment_intent.succeeded');
    } finally {
      ClockTestHelper.restore();
    }
  });

  it('accepts a header with several v1= signatures when one matches', () => {
    const service = createService(secret);
    const validSignature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyJson,
      secret,
    });
    const multiSignature = `${validSignature},v1=deadbeef1234567890abcdef`;

    const result = service.verify(rawBody, multiSignature);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('payment_intent.succeeded');
  });

  it.each(['development', 'test', 'production', 'staging'])(
    'rejects everything when no secret is configured, including e2e-test, in %s',
    (nodeEnv) => {
      const service = createService('', nodeEnv);
      const validSignature = Stripe.webhooks.generateTestHeaderString({
        payload: prettyJson,
        secret,
      });

      expect(service.verify(rawBody, 'e2e-test')).toBeNull();
      expect(service.verify(rawBody, validSignature)).toBeNull();
    },
  );

  it('never throws on unexpected or corrupt inputs', () => {
    const service = createService(secret);
    const corruptBuffer = Buffer.from([0xff, 0xfe, 0x00, 0x01]);

    expect(() => service.verify(corruptBuffer, 'invalid')).not.toThrow();
    expect(service.verify(corruptBuffer, 'invalid')).toBeNull();
  });
});
