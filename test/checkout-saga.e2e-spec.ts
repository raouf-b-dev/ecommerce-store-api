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
import { isHttpStatus } from 'src/testing/helpers/http-status.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { pollUntil } from 'src/testing/helpers/poll.helper';

const STARTING_STOCK = 1;
const INVENTORY_POLL_INTERVAL_MS = 1500;

interface InventorySnapshot {
  availableQuantity: number;
  reservedQuantity: number;
}

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

  async function getInventory(productId: number): Promise<InventorySnapshot> {
    const response = await http.get(
      `${E2E_API_PREFIX}/inventory/products/${productId}`,
    );
    expect(response.status).toBe(HttpStatus.OK);
    return {
      availableQuantity: Number(response.body.availableQuantity),
      reservedQuantity: Number(response.body.reservedQuantity),
    };
  }

  async function waitForInventory(
    productId: number,
    expected: InventorySnapshot,
    description: string,
  ): Promise<InventorySnapshot> {
    return pollUntil(
      async () => {
        const response = await http.get(
          `${E2E_API_PREFIX}/inventory/products/${productId}`,
        );
        if (!isHttpStatus(response.status, HttpStatus.OK)) {
          return null;
        }
        const snapshot = {
          availableQuantity: Number(response.body.availableQuantity),
          reservedQuantity: Number(response.body.reservedQuantity),
        };
        return snapshot.availableQuantity === expected.availableQuantity &&
          snapshot.reservedQuantity === expected.reservedQuantity
          ? snapshot
          : null;
      },
      {
        description,
        timeoutMs: 90_000,
        intervalMs: INVENTORY_POLL_INTERVAL_MS,
      },
    );
  }

  async function checkout(cartId: number): Promise<number> {
    const response = await E2eCheckoutHelper.checkout(http, customer, cartId);
    expect(response.status).toBeLessThan(300);
    expect(response.body.orderId).toBeGreaterThan(0);
    expect(response.body.jobId).toBeDefined();
    expect(response.body.status).toBe(OrderStatus.PENDING_PAYMENT);
    return Number(response.body.orderId);
  }

  async function waitForPaymentIntent(orderId: number): Promise<{
    gatewayPaymentIntentId: string;
    reservationId: string;
  }> {
    const payment = await pollUntil(
      async () => {
        const response = await http
          .get(`${E2E_API_PREFIX}/payments/orders/${orderId}`)
          .set(AuthTestHelper.bearer(customer.accessToken));
        if (!isHttpStatus(response.status, HttpStatus.OK)) {
          return null;
        }
        expect(response.body).toHaveProperty('gatewayPaymentIntentId');
        const gatewayPaymentIntentId = response.body.gatewayPaymentIntentId;
        const reservationId = response.body.metadata?.reservationId;
        if (!gatewayPaymentIntentId || !reservationId) {
          return null;
        }
        return {
          gatewayPaymentIntentId: String(gatewayPaymentIntentId),
          reservationId: String(reservationId),
        };
      },
      { description: `payment intent for order ${orderId}`, timeoutMs: 90_000 },
    );

    return payment;
  }

  async function postStripeWebhook(
    paymentIntentId: string,
    eventType: 'payment_intent.succeeded' | 'payment_intent.payment_failed',
    metadata: Record<string, string>,
  ): Promise<void> {
    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('stripe-signature', 'e2e-test')
      .send({
        type: eventType,
        data: {
          object: {
            id: paymentIntentId,
            metadata,
            last_payment_error:
              eventType === 'payment_intent.payment_failed'
                ? { message: 'Card declined' }
                : undefined,
          },
        },
      });

    expect(response.status).toBe(HttpStatus.OK);
  }

  async function waitForOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<Record<string, unknown>> {
    return pollUntil(
      async () => {
        const response = await http
          .get(`${E2E_API_PREFIX}/orders/${orderId}`)
          .set(AuthTestHelper.bearer(customer.accessToken));
        if (response.status !== 200) {
          return null;
        }
        return response.body.status === status ? response.body : null;
      },
      {
        description: `order ${orderId} status ${status}`,
        timeoutMs: 90_000,
      },
    );
  }

  it('completes purchase, confirms stock, and returns CQRS userName plus sku', async () => {
    const before = await getInventory(happyProduct.id);
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

    await waitForInventory(
      happyProduct.id,
      { availableQuantity: 0, reservedQuantity: STARTING_STOCK },
      'stock reserved after checkout intent',
    );

    const payment = await waitForPaymentIntent(orderId);
    await postStripeWebhook(
      payment.gatewayPaymentIntentId,
      'payment_intent.succeeded',
      {
        reservationId: payment.reservationId,
        cartId: String(cartId),
      },
    );

    const order = await waitForOrderStatus(orderId, OrderStatus.CONFIRMED);
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

    await waitForInventory(
      happyProduct.id,
      { availableQuantity: 0, reservedQuantity: 0 },
      'reservation confirmed after payment success',
    );
    expect(await getInventory(happyProduct.id)).toEqual({
      availableQuantity: 0,
      reservedQuantity: 0,
    });
  }, 180_000);

  it('marks the order payment_failed and restores available stock', async () => {
    const before = await getInventory(failProduct.id);
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

    await waitForInventory(
      failProduct.id,
      { availableQuantity: 0, reservedQuantity: STARTING_STOCK },
      'stock reserved before payment failure',
    );

    const payment = await waitForPaymentIntent(orderId);
    await postStripeWebhook(
      payment.gatewayPaymentIntentId,
      'payment_intent.payment_failed',
      {
        reservationId: payment.reservationId,
        cartId: String(cartId),
      },
    );

    const order = await waitForOrderStatus(orderId, OrderStatus.PAYMENT_FAILED);
    expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);

    await waitForInventory(
      failProduct.id,
      { availableQuantity: STARTING_STOCK, reservedQuantity: 0 },
      'stock released after payment failure',
    );
    expect(await getInventory(failProduct.id)).toEqual({
      availableQuantity: STARTING_STOCK,
      reservedQuantity: 0,
    });
  }, 180_000);
});
