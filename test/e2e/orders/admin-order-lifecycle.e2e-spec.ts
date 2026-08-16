/**
 * Admin order lifecycle after payment confirmation: process/ship and cancel.
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

describe('Admin order lifecycle (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let admin: AuthSession;
  let customer: AuthSession;
  let shipProduct: E2eCatalogProduct;
  let cancelProduct: E2eCatalogProduct;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
    shipProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'ship',
    );
    cancelProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'cancel',
    );
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'AdminFlow',
      lastName: 'Buyer',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  async function checkoutAndConfirm(
    product: E2eCatalogProduct,
  ): Promise<number> {
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
    expect(orderId).toBeGreaterThan(0);

    const payment = await E2eOrderHelper.waitForPaymentIntent(
      http,
      customer,
      orderId,
    );
    await E2eStripeWebhookHelper.postAndExpectOk(http, {
      paymentIntentId: payment.gatewayPaymentIntentId,
      eventType: 'payment_intent.succeeded',
      metadata: {
        reservationId: payment.reservationId,
        cartId: String(cartId),
      },
    });

    await E2eOrderHelper.waitForOrderStatus(
      http,
      customer,
      orderId,
      OrderStatus.CONFIRMED,
    );
    return orderId;
  }

  it('lets admin process and ship a confirmed order', async () => {
    const orderId = await checkoutAndConfirm(shipProduct);

    const processResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/process`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(processResponse.status).toBe(HttpStatus.OK);
    expect(processResponse.body.status).toBe(OrderStatus.PROCESSING);

    const shipResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/ship`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(shipResponse.status).toBe(HttpStatus.OK);
    expect(shipResponse.body.status).toBe(OrderStatus.SHIPPED);

    const customerView = await http
      .get(`${E2E_API_PREFIX}/orders/${orderId}`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(customerView.status).toBe(HttpStatus.OK);
    expect(customerView.body.status).toBe(OrderStatus.SHIPPED);
  }, 180_000);

  it('lets admin cancel a confirmed order', async () => {
    const orderId = await checkoutAndConfirm(cancelProduct);

    const cancelResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/cancel`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(cancelResponse.status).toBe(HttpStatus.OK);
    expect(cancelResponse.body.status).toBe(OrderStatus.CANCELLED);

    const customerView = await http
      .get(`${E2E_API_PREFIX}/orders/${orderId}`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(customerView.status).toBe(HttpStatus.OK);
    expect(customerView.body.status).toBe(OrderStatus.CANCELLED);
  }, 180_000);
});
