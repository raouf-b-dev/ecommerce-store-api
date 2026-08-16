/**
 * Checkout HTTP idempotency: existing IdempotencyInterceptor contract.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { OrderStatus } from 'src/modules/orders/core/domain/value-objects/order-status.enum';
import {
  AuthSession,
  AuthTestHelper,
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
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';
import { Response } from 'supertest';

function uniqueKey(label: string): string {
  return `e2e-checkout-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

describe('Checkout idempotency (e2e)', () => {
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
      10,
      'idem',
    );
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'Idempotent',
      lastName: 'Buyer',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('replays the cached checkout response for a completed key', async () => {
    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      product.id,
    );
    const beforeCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    const key = uniqueKey('replay');

    const first = await E2eCheckoutHelper.checkout(http, customer, cartId, {
      headers: { 'x-idempotency-key': key },
    });
    expect(first.status).toBeLessThan(300);
    expect(first.body.orderId).toBeGreaterThan(0);
    expect(first.body.jobId).toBeDefined();
    expect(first.body.status).toBe(OrderStatus.PENDING_PAYMENT);

    const replay = await E2eCheckoutHelper.checkout(http, customer, cartId, {
      headers: { 'x-idempotency-key': key },
    });
    expect(replay.status).toBeLessThan(300);
    expect(replay.body.orderId).toBe(first.body.orderId);
    expect(replay.body.jobId).toBe(first.body.jobId);

    const differentBody = await E2eCheckoutHelper.checkout(
      http,
      customer,
      999999,
      {
        headers: { 'x-idempotency-key': key },
        includeShipping: false,
      },
    );
    expect(differentBody.status).toBeLessThan(300);
    expect(differentBody.body.orderId).toBe(first.body.orderId);

    const afterCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    expect(afterCount - beforeCount).toBe(1);
  }, 120_000);

  it('returns 409 or the cached response when the same key is in flight', async () => {
    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      product.id,
    );
    const beforeCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    const key = uniqueKey('inflight');

    const [first, second] = await Promise.all([
      E2eCheckoutHelper.checkout(http, customer, cartId, {
        headers: { 'x-idempotency-key': key },
      }),
      E2eCheckoutHelper.checkout(http, customer, cartId, {
        headers: { 'x-idempotency-key': key },
      }),
    ]);

    const responses = [first, second];
    const successes = responses.filter((response) => response.status < 300);
    const conflicts = responses.filter((response) =>
      isHttpStatus(response.status, HttpStatus.CONFLICT),
    );

    expect(successes.length).toBeGreaterThanOrEqual(1);
    const orderIds = new Set(
      successes.map((response) => Number(response.body.orderId)),
    );
    expect(orderIds.size).toBe(1);

    if (conflicts.length > 0) {
      HttpErrorAssertionHelper.assertErrorContract(
        { body: conflicts[0].body } as Response,
        {
          statusCode: HttpStatus.CONFLICT,
          messageContains: 'already in progress',
        },
      );
    }

    const afterCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    expect(afterCount - beforeCount).toBe(1);
  }, 120_000);

  it('releases the key when the first checkout fails so a retry can proceed', async () => {
    const beforeCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    const key = uniqueKey('release');

    const failed = await E2eCheckoutHelper.checkout(http, customer, 0, {
      headers: { 'x-idempotency-key': key },
      body: { cartId: 'not-a-number' },
    });
    expect(failed.status).toBe(HttpStatus.BAD_REQUEST);
    HttpErrorAssertionHelper.assertErrorContract(
      { body: failed.body } as Response,
      {
        statusCode: HttpStatus.BAD_REQUEST,
        messageContains: 'Validation failed',
        hasValidationErrors: true,
      },
    );

    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      product.id,
    );
    const retry = await E2eCheckoutHelper.checkout(http, customer, cartId, {
      headers: { 'x-idempotency-key': key },
    });
    expect(retry.status).toBeLessThan(300);
    expect(retry.body.orderId).toBeGreaterThan(0);

    const afterCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    expect(afterCount - beforeCount).toBe(1);
  }, 120_000);
});
