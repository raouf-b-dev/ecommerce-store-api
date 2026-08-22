/**
 * Ignored Stripe webhook event types return success without side effects.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { OrderStatus } from 'src/modules/orders/core/domain/value-objects/order-status.enum';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eCatalogHelper,
  E2eCatalogProduct,
} from 'src/testing/helpers/e2e-catalog.helper';
import { E2eCheckoutHelper } from 'src/testing/helpers/e2e-checkout.helper';
import { E2eOrderHelper } from 'src/testing/helpers/e2e-order.helper';
import { E2eStripeWebhookHelper } from 'src/testing/helpers/e2e-stripe-webhook.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

describe('Stripe webhook ignored events (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let customer: AuthSession;
  let product: E2eCatalogProduct;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    const admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
    product = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'webhook',
    );
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'Webhook',
      lastName: 'Buyer',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('acknowledges an unmapped Stripe event type without error', async () => {
    const response = await E2eStripeWebhookHelper.postStripeWebhook(http, {
      paymentIntentId: 'pi_ignored_standalone',
      eventType: 'payment_intent.created',
    });

    expect(response.status).toBe(HttpStatus.OK);
    // Result.success(null) serializes as an empty JSON body over HTTP.
    expect(
      response.body == null || Object.keys(response.body).length === 0,
    ).toBe(true);
  });

  it('leaves a pending order unchanged when an ignored event arrives', async () => {
    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      product.id,
    );
    const checkoutResponse = await E2eCheckoutHelper.checkout(
      http,
      customer,
      cartId,
    );
    expect(checkoutResponse.status).toBeLessThan(300);
    const orderId = Number(checkoutResponse.body.orderId);

    const payment = await E2eOrderHelper.waitForPaymentIntent(
      http,
      customer,
      orderId,
    );

    await E2eStripeWebhookHelper.postAndExpectOk(http, {
      paymentIntentId: payment.gatewayPaymentIntentId,
      eventType: 'payment_intent.created',
      metadata: {
        reservationId: payment.reservationId,
        cartId: String(cartId),
      },
    });

    const orderResponse = await http
      .get(`${E2E_API_PREFIX}/orders/${orderId}`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(orderResponse.status).toBe(HttpStatus.OK);
    expect(orderResponse.body.status).toBe(OrderStatus.PENDING_PAYMENT);
  }, 180_000);
});
