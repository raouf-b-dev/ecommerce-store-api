/**
 * Stripe webhook signature gate (verifies signatures over raw request body).
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import Stripe from 'stripe';
import { E2E_API_PREFIX } from 'src/testing/helpers/auth-test.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
  E2E_STRIPE_WEBHOOK_SECRET,
} from 'src/testing/helpers/e2e-test-app.helper';
import { E2eStripeWebhookHelper } from 'src/testing/helpers/e2e-stripe-webhook.helper';
import {
  HandlePaymentWebhookService,
  PaymentWebhookResult,
} from 'src/modules/payments/core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentStatusType } from 'src/modules/payments/core/domain/value-objects/payment-status';
import { Result } from 'src/shared-kernel/domain/result';

describe('Stripe webhook signature gate (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;

  const prettyPayload = JSON.stringify(
    {
      id: 'evt_test_e2e_signature',
      type: 'payment_intent.created',
      data: {
        object: {
          id: 'pi_test_sig',
          metadata: {
            note: 'pretty-printed-test',
          },
        },
      },
    },
    null,
    2,
  );

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a valid signature over a pretty-printed body and returns 200', async () => {
    const response = await E2eStripeWebhookHelper.postSignedWebhook(
      http,
      prettyPayload,
    );

    expect(response.status).toBe(HttpStatus.OK);
  });

  it('rejects the same body with one byte changed', async () => {
    const validSignature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyPayload,
      secret: E2E_STRIPE_WEBHOOK_SECRET,
    });

    const tamperedPayload = prettyPayload + ' ';
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('Content-Type', 'application/json')
      .set('stripe-signature', validSignature)
      .send(tamperedPayload);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('rejects requests with a stale timestamp', async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 301;
    const staleSignature = Stripe.webhooks.generateTestHeaderString({
      payload: prettyPayload,
      secret: E2E_STRIPE_WEBHOOK_SECRET,
      timestamp: staleTimestamp,
    });

    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('Content-Type', 'application/json')
      .set('stripe-signature', staleSignature)
      .send(prettyPayload);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('rejects requests missing the stripe-signature header', async () => {
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('Content-Type', 'application/json')
      .send(prettyPayload);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('rejects a forged header and the old e2e-test header', async () => {
    const forgedResponse = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'forged-signature-value')
      .send(prettyPayload);

    expect(forgedResponse.status).toBe(HttpStatus.BAD_REQUEST);

    const bypassResponse = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'e2e-test')
      .send(prettyPayload);

    expect(bypassResponse.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('delivers metadata containing <script> and & byte-for-byte unmodified in the parsed event', async () => {
    const webhookService = moduleRef.get(HandlePaymentWebhookService);
    const mockSuccessResult: PaymentWebhookResult = {
      paymentId: 9999,
      orderId: 8888,
      status: PaymentStatusType.COMPLETED,
    };
    const executeSpy = jest
      .spyOn(webhookService, 'execute')
      .mockResolvedValue(Result.success(mockSuccessResult));

    const specialMetadata = {
      xss: '<script>alert("safe")</script>',
      symbols: 'Tom & Jerry && "quotes" <tag>',
    };

    const payloadWithSpecialChars = JSON.stringify(
      {
        id: 'evt_test_special_chars',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_script_xss',
            metadata: specialMetadata,
          },
        },
      },
      null,
      2,
    );

    const response = await E2eStripeWebhookHelper.postSignedWebhook(
      http,
      payloadWithSpecialChars,
    );

    expect(response.status).toBe(HttpStatus.OK);
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: specialMetadata }),
    );
  });
});
