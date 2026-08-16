/**
 * Checkout validation HTTP contracts: empty cart and insufficient stock.
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
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';
import { Response } from 'supertest';

describe('Checkout validation (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let admin: AuthSession;
  let customer: AuthSession;
  let product: E2eCatalogProduct;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
    product = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'validation',
    );
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'Validation',
      lastName: 'Buyer',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('rejects checkout of an empty cart without creating a payment intent', async () => {
    const cart = await E2eCheckoutHelper.createCart(http, customer.accessToken);
    const beforeCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );

    const response = await E2eCheckoutHelper.checkout(http, customer, cart.id);

    expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    HttpErrorAssertionHelper.assertErrorContract(
      { body: response.body } as Response,
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: 'Cart is empty',
      },
    );

    const afterCount = await E2eCheckoutHelper.listOrderCount(
      http,
      customer.accessToken,
    );
    expect(afterCount).toBe(beforeCount);
  });

  it('does not confirm an order when stock is insufficient after cart add', async () => {
    const cartId = await E2eCheckoutHelper.createCartWithItem(
      http,
      customer.accessToken,
      product.id,
    );

    await E2eInventoryHelper.setAvailableQuantity(moduleRef, product.id, 0);

    const checkoutResponse = await E2eCheckoutHelper.checkout(
      http,
      customer,
      cartId,
    );
    expect(checkoutResponse.status).toBeLessThan(300);
    expect(checkoutResponse.body.orderId).toBeGreaterThan(0);
    const orderId = Number(checkoutResponse.body.orderId);

    const cancelled = await E2eOrderHelper.waitForOrderStatus(
      http,
      customer,
      orderId,
      OrderStatus.CANCELLED,
    );
    expect(cancelled.status).toBe(OrderStatus.CANCELLED);

    const paymentResponse = await http
      .get(`${E2E_API_PREFIX}/payments/orders/${orderId}`)
      .set(AuthTestHelper.bearer(customer.accessToken));

    expect(paymentResponse.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    HttpErrorAssertionHelper.assertErrorContract(paymentResponse, {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      messageContains: `Payment for order ID ${orderId} not found`,
    });
  }, 180_000);
});
