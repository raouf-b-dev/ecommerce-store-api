/**
 * Stripe webhook signature gate (fail-closed outside documented test bypass).
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { E2E_API_PREFIX } from 'src/testing/helpers/auth-test.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

describe('Stripe webhook signature gate (e2e)', () => {
  let app: INestApplication;
  let http: E2eHttpClient;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    http = E2eTestAppHelper.getHttp(app);
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('rejects requests without a stripe-signature header', async () => {
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .send({
        type: 'payment_intent.created',
        data: { object: { id: 'pi_x' } },
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects forged signatures outside the documented test bypass', async () => {
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('stripe-signature', 'forged-signature')
      .send({
        type: 'payment_intent.created',
        data: { object: { id: 'pi_x' } },
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('accepts the documented test bypass signature', async () => {
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('stripe-signature', 'e2e-test')
      .send({
        type: 'payment_intent.created',
        data: { object: { id: 'pi_x' } },
      });

    expect(response.status).toBe(HttpStatus.OK);
  });
});
