/**
 * Full-app checkout SAGA: happy path, payment-failure compensation, CQRS read shapes.
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
import { E2eInventoryHelper } from 'src/testing/helpers/e2e-inventory.helper';
import { E2eOrderHelper } from 'src/testing/helpers/e2e-order.helper';
import { E2eStripeWebhookHelper } from 'src/testing/helpers/e2e-stripe-webhook.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

const STARTING_STOCK = 1;

describe('Checkout SAGA (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let customer: AuthSession;
  let happyProduct: E2eCatalogProduct;
  let failProduct: E2eCatalogProduct;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    const admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
    happyProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      STARTING_STOCK,
      'happy',
    );
    failProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      STARTING_STOCK,
      'fail',
    );
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'Checkout',
      lastName: 'Buyer',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  async function checkout(cartId: number): Promise<number> {
    const response = await E2eCheckoutHelper.checkout(http, customer, cartId);
    expect(response.status).toBeLessThan(300);
    expect(response.body.orderId).toBeGreaterThan(0);
    expect(response.body.jobId).toBeDefined();
    expect(response.body.status).toBe(OrderStatus.PENDING_PAYMENT);
    return Number(response.body.orderId);
  }

  it('completes purchase, confirms stock, and returns CQRS userName plus sku', async () => {
    const before = await E2eInventoryHelper.getProductStock(
      http,
      happyProduct.id,
    );
    expect(before).toEqual({
      availableQuantity: STARTING_STOCK,
      reservedQuantity: 0,
    });

    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      happyProduct.id,
    );
    const orderId = await checkout(cartId);

    const payment = await E2eOrderHelper.waitForPaymentIntent(
      http,
      customer,
      orderId,
    );
    expect(
      await E2eInventoryHelper.getProductStock(http, happyProduct.id),
    ).toEqual({
      availableQuantity: 0,
      reservedQuantity: STARTING_STOCK,
    });

    await E2eStripeWebhookHelper.postAndExpectOk(http, {
      paymentIntentId: payment.gatewayPaymentIntentId,
      eventType: 'payment_intent.succeeded',
      metadata: {
        reservationId: payment.reservationId,
        cartId: String(cartId),
      },
    });

    const order = await E2eOrderHelper.waitForOrderStatus(
      http,
      customer,
      orderId,
      OrderStatus.CONFIRMED,
    );
    expect(order.userName).toBe(`${customer.firstName} ${customer.lastName}`);
    expect(order.userEmail).toBe(customer.email);
    const items = order.items as Array<{ sku: string }>;
    expect(items[0].sku).toBe(happyProduct.sku);

    const listResponse = await http
      .get(`${E2E_API_PREFIX}/orders`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(listResponse.status).toBe(HttpStatus.OK);
    const listed = Array.isArray(listResponse.body)
      ? listResponse.body
      : listResponse.body.items;
    const listedOrder = listed.find(
      (row: { id: number }) => Number(row.id) === orderId,
    );
    expect(listedOrder).toBeDefined();
    expect(listedOrder.userName).toBe(
      `${customer.firstName} ${customer.lastName}`,
    );

    await E2eInventoryHelper.waitForProductStock(
      http,
      happyProduct.id,
      { availableQuantity: 0, reservedQuantity: 0 },
      'reservation confirmed after payment success',
    );
  }, 180_000);

  it('marks the order payment_failed and restores available stock', async () => {
    const before = await E2eInventoryHelper.getProductStock(
      http,
      failProduct.id,
    );
    expect(before).toEqual({
      availableQuantity: STARTING_STOCK,
      reservedQuantity: 0,
    });

    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      failProduct.id,
    );
    const orderId = await checkout(cartId);

    const payment = await E2eOrderHelper.waitForPaymentIntent(
      http,
      customer,
      orderId,
    );
    expect(
      await E2eInventoryHelper.getProductStock(http, failProduct.id),
    ).toEqual({
      availableQuantity: 0,
      reservedQuantity: STARTING_STOCK,
    });

    await E2eStripeWebhookHelper.postAndExpectOk(http, {
      paymentIntentId: payment.gatewayPaymentIntentId,
      eventType: 'payment_intent.payment_failed',
      metadata: {
        reservationId: payment.reservationId,
        cartId: String(cartId),
      },
    });

    const order = await E2eOrderHelper.waitForOrderStatus(
      http,
      customer,
      orderId,
      OrderStatus.PAYMENT_FAILED,
    );
    expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);

    await E2eInventoryHelper.waitForProductStock(
      http,
      failProduct.id,
      { availableQuantity: STARTING_STOCK, reservedQuantity: 0 },
      'stock released after payment failure',
    );
  }, 180_000);
});
