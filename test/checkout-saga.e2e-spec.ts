/**
 * Full-app checkout SAGA: happy path, payment-failure compensation, CQRS read shapes.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { CartRepository } from 'src/modules/carts/core/domain/repositories/cart.repository';
import { InventoryQueryService } from 'src/modules/inventory/core/application/ports/inventory-query.service';
import { InventoryReservationGateway } from 'src/modules/orders/core/application/ports/inventory-reservation.gateway';
import { OrderStatus } from 'src/modules/orders/core/domain/value-objects/order-status.enum';
import { PaymentRepository } from 'src/modules/payments/core/domain/repositories/payment.repository';
import { PaymentMethodType } from 'src/shared-kernel/domain/value-objects/payment-method';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eCatalogHelper,
  E2eCatalogProduct,
} from 'src/testing/helpers/e2e-catalog.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { pollUntil } from 'src/testing/helpers/poll.helper';

const STARTING_STOCK = 1;

interface InventorySnapshot {
  availableQuantity: number;
  reservedQuantity: number;
}

function parseMetadata(
  paymentMethodInfo: string | null,
): Record<string, string> {
  if (!paymentMethodInfo) {
    return {};
  }

  try {
    const parsed = JSON.parse(paymentMethodInfo) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return {};
  }
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
    const inventoryQuery = moduleRef.get(InventoryQueryService, {
      strict: false,
    });

    return pollUntil(
      async () => {
        const result = await inventoryQuery.getByProductId(productId);
        if (result.isFailure || !result.value) {
          return null;
        }

        const snapshot = {
          availableQuantity: result.value.availableQuantity,
          reservedQuantity: result.value.reservedQuantity,
        };
        return snapshot.availableQuantity === expected.availableQuantity &&
          snapshot.reservedQuantity === expected.reservedQuantity
          ? snapshot
          : null;
      },
      { description, timeoutMs: 90_000 },
    );
  }

  async function createCartWithItem(productId: number): Promise<number> {
    const createResponse = await http
      .post(`${E2E_API_PREFIX}/carts`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect([
      HttpStatus.CREATED,
      HttpStatus.OK,
      HttpStatus.NO_CONTENT,
    ]).toContain(createResponse.status);

    const cartRepository = moduleRef.get(CartRepository, { strict: false });
    const cartResult = await cartRepository.findByuserId(customer.userId);
    if (cartResult.isFailure) {
      throw new Error(`Cart not found: ${cartResult.error.message}`);
    }
    const cartId = cartResult.value.id;
    if (!cartId) {
      throw new Error('Expected persisted cart id');
    }

    const addResponse = await http
      .post(`${E2E_API_PREFIX}/carts/${cartId}/items`)
      .set(AuthTestHelper.bearer(customer.accessToken))
      .send({ productId, quantity: 1 });
    expect(addResponse.status).toBeLessThan(300);

    return cartId;
  }

  async function checkout(cartId: number): Promise<number> {
    const response = await http
      .post(`${E2E_API_PREFIX}/orders/checkout`)
      .set(AuthTestHelper.bearer(customer.accessToken))
      .send({
        cartId,
        paymentMethod: PaymentMethodType.STRIPE,
        shippingAddress: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          street: '1 Market Street',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
          phone: '5551234567',
        },
      });

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
    await pollUntil(
      async () => {
        const response = await http
          .get(`${E2E_API_PREFIX}/payments/orders/${orderId}`)
          .set(AuthTestHelper.bearer(customer.accessToken));
        return response.status === 200 ? response.body : null;
      },
      { description: `payment for order ${orderId}`, timeoutMs: 90_000 },
    );

    const paymentRepository = moduleRef.get(PaymentRepository, {
      strict: false,
    });
    const payment = await pollUntil(
      async () => {
        const result = await paymentRepository.findByOrderId(orderId);
        if (result.isFailure || result.value.length === 0) {
          return null;
        }
        const found = result.value[0];
        return found.gatewayPaymentIntentId ? found : null;
      },
      {
        description: `gateway payment intent for order ${orderId}`,
        timeoutMs: 30_000,
      },
    );

    const metadata = parseMetadata(payment.paymentMethodInfo);
    let reservationId = metadata.reservationId;

    if (!reservationId) {
      const inventoryGateway = moduleRef.get(InventoryReservationGateway, {
        strict: false,
      });
      const reservations = await inventoryGateway.getOrderReservations(orderId);
      if (reservations.isSuccess && reservations.value[0]?.id) {
        reservationId = String(reservations.value[0].id);
      }
    }

    if (!reservationId) {
      throw new Error(`No reservation id found for order ${orderId}`);
    }

    return {
      gatewayPaymentIntentId: payment.gatewayPaymentIntentId as string,
      reservationId,
    };
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

    const cartId = await createCartWithItem(happyProduct.id);
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

    const cartId = await createCartWithItem(failProduct.id);
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
