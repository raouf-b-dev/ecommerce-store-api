/**
 * Shopper cancel of own orders: confirmed success, repeat cancel, and
 * processing forbidden vs admin manage_orders.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { OrderStatus } from 'src/modules/orders/core/domain/value-objects/order-status.enum';
import { PaymentStatusType } from 'src/modules/payments/core/domain/value-objects/payment-status';
import { ErrorCode } from 'src/shared-kernel/domain/exceptions/error-code';
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
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';
import { assertDefined } from 'src/testing';
import { DataSource } from 'typeorm';
import { PaymentEntity } from 'src/modules/payments/secondary-adapters/orm/payment.schema';

describe('Shopper cancel order (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let admin: AuthSession;
  let customer: AuthSession;
  let confirmedProduct: E2eCatalogProduct;
  let shopperProcessingProduct: E2eCatalogProduct;
  let adminProcessingProduct: E2eCatalogProduct;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
    confirmedProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'shopper-cancel-confirmed',
    );
    shopperProcessingProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'shopper-cancel-processing',
    );
    adminProcessingProduct = await E2eCatalogHelper.createProductWithStock(
      moduleRef,
      http,
      admin,
      1,
      'admin-cancel-processing',
    );
    customer = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'ShopperCancel',
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

  it('lets a shopper cancel their own confirmed paid order, and accepts a repeat cancel', async () => {
    const orderId = await checkoutAndConfirm(confirmedProduct);

    const cancelResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/cancel`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(cancelResponse.status).toBe(HttpStatus.OK);
    expect(cancelResponse.body.status).toBe(OrderStatus.CANCELLED);

    const payment = await E2eOrderHelper.waitForPaymentStatus(
      http,
      customer,
      orderId,
      PaymentStatusType.REFUNDED,
    );
    expect(String(payment.status).toUpperCase()).toBe(
      PaymentStatusType.REFUNDED,
    );

    await E2eInventoryHelper.waitForProductStock(
      http,
      admin.accessToken,
      confirmedProduct.id,
      { availableQuantity: 1, reservedQuantity: 0 },
      'restock after shopper cancel',
    );

    const dataSource = moduleRef.get(DataSource);
    const paymentRecord = await dataSource
      .getRepository(PaymentEntity)
      .findOne({
        where: { orderId },
        relations: { refunds: true },
      });
    assertDefined(paymentRecord);
    expect(paymentRecord.refunds).toHaveLength(1);
    expect(Number(paymentRecord.refundedAmount)).toBe(
      Number(paymentRecord.amount),
    );

    const repeatCancelResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/cancel`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(repeatCancelResponse.status).toBe(HttpStatus.OK);
    expect(repeatCancelResponse.body.status).toBe(OrderStatus.CANCELLED);

    const stockAfterRepeat = await E2eInventoryHelper.getProductStock(
      http,
      admin.accessToken,
      confirmedProduct.id,
    );
    expect(stockAfterRepeat).toEqual({
      availableQuantity: 1,
      reservedQuantity: 0,
    });

    const paymentAfterRepeat = await dataSource
      .getRepository(PaymentEntity)
      .findOne({
        where: { orderId },
        relations: { refunds: true },
      });
    assertDefined(paymentAfterRepeat);
    expect(paymentAfterRepeat.refunds).toHaveLength(1);
  }, 180_000);

  it('returns 409 DOMAIN_ERROR when a shopper cancels their own processing order', async () => {
    const orderId = await checkoutAndConfirm(shopperProcessingProduct);

    const processResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/process`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(processResponse.status).toBe(HttpStatus.OK);
    expect(processResponse.body.status).toBe(OrderStatus.PROCESSING);

    const cancelResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/cancel`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(cancelResponse.status).toBe(HttpStatus.CONFLICT);
    HttpErrorAssertionHelper.assertErrorContract(cancelResponse, {
      statusCode: HttpStatus.CONFLICT,
      code: ErrorCode.DOMAIN_ERROR,
    });

    const customerView = await http
      .get(`${E2E_API_PREFIX}/orders/${orderId}`)
      .set(AuthTestHelper.bearer(customer.accessToken));
    expect(customerView.status).toBe(HttpStatus.OK);
    expect(customerView.body.status).toBe(OrderStatus.PROCESSING);
  }, 180_000);

  it('lets admin with manage_orders cancel a processing order', async () => {
    const orderId = await checkoutAndConfirm(adminProcessingProduct);

    const processResponse = await http
      .patch(`${E2E_API_PREFIX}/orders/${orderId}/process`)
      .set(AuthTestHelper.bearer(admin.accessToken));
    expect(processResponse.status).toBe(HttpStatus.OK);
    expect(processResponse.body.status).toBe(OrderStatus.PROCESSING);

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
