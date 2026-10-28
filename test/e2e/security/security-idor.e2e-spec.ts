/**
 * Full-app IDOR regression suite.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import { E2eCatalogHelper } from 'src/testing/helpers/e2e-catalog.helper';
import { E2eCheckoutHelper } from 'src/testing/helpers/e2e-checkout.helper';
import { E2eOrderHelper } from 'src/testing/helpers/e2e-order.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';
import { SeedDemoAuthUsersUseCase } from 'src/modules/authentication/core/application/seed/seed-demo-auth-users.usecase';

const MISSING_ORDER_ID = 999999;

describe('Security IDOR (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;
  let userA: AuthSession;
  let userB: AuthSession;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);

    userA = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'user-a',
      lastName: 'Tester',
    });
    userB = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'user-b',
      lastName: 'Tester',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  async function cartIdFor(user: AuthSession): Promise<number> {
    const cart = await E2eCheckoutHelper.createCart(http, user.accessToken);
    return cart.id;
  }

  // Nest serializes JSON null; some clients may surface it as empty body.
  function isEmptyBody(body: unknown): boolean {
    return (
      body == null ||
      (typeof body === 'object' && Object.keys(body).length === 0)
    );
  }

  function getAs(user: AuthSession, path: string) {
    return http
      .get(`${E2E_API_PREFIX}${path}`)
      .set(AuthTestHelper.bearer(user.accessToken));
  }

  describe('users', () => {
    it('allows user to read own profile', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/users/${userA.userId}`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userA.userId);
    });

    it('denies user reading another user profile', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/users/${userB.userId}`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      HttpErrorAssertionHelper.assertErrorContract(response, {
        statusCode: HttpStatus.NOT_FOUND,
        messageContains: `User with id ${userB.userId} not found`,
      });
    });

    it('denies user mutating another user address', async () => {
      const response = await http
        .post(`${E2E_API_PREFIX}/users/${userB.userId}/addresses`)
        .set(AuthTestHelper.bearer(userA.accessToken))
        .send({
          street: '999 Hacker Lane',
          city: 'Denial',
          state: 'CA',
          postalCode: '90001',
          country: 'US',
        });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      HttpErrorAssertionHelper.assertErrorContract(response, {
        statusCode: HttpStatus.NOT_FOUND,
        messageContains: `User with id ${userB.userId} not found`,
      });
    });
  });

  describe('carts', () => {
    it('returns the same cart id when creating twice', async () => {
      const first = await E2eCheckoutHelper.createCart(http, userA.accessToken);
      const second = await E2eCheckoutHelper.createCart(
        http,
        userA.accessToken,
      );
      expect(second.id).toBe(first.id);
      expect(second.items).toEqual(expect.any(Array));
    });

    it('denies access to another users cart without ownership', async () => {
      const cartId = await cartIdFor(userB);

      const crossRead = await http
        .get(`${E2E_API_PREFIX}/carts/${cartId}`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(crossRead.status).toBe(HttpStatus.NOT_FOUND);
      HttpErrorAssertionHelper.assertErrorContract(crossRead, {
        statusCode: HttpStatus.NOT_FOUND,
        messageContains: 'not found',
      });
    });
  });

  describe('checkout', () => {
    it('denies checkout with another users cart', async () => {
      const cartId = await cartIdFor(userB);

      const checkoutResponse = await E2eCheckoutHelper.checkout(
        http,
        userA,
        cartId,
        { includeShipping: false },
      );

      expect(checkoutResponse.status).toBe(HttpStatus.NOT_FOUND);
      HttpErrorAssertionHelper.assertErrorContract(checkoutResponse, {
        statusCode: HttpStatus.NOT_FOUND,
        messageContains: 'not found',
      });
    });
  });

  describe('orders and payments', () => {
    let customerBOrderId: number;
    let admin: AuthSession;
    let viewer: Pick<AuthSession, 'accessToken' | 'refreshToken'>;
    const viewerPassword = AuthTestHelper.password;

    beforeAll(async () => {
      admin = await E2eCatalogHelper.seedAdminSession(moduleRef, http);
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const unused = {
        email: `e2e-unused-${stamp}@example.com`,
        password: viewerPassword,
      };
      const viewerEmail = `e2e-viewer-${stamp}@example.com`;
      const seeded = await moduleRef
        .get(SeedDemoAuthUsersUseCase, { strict: false })
        .execute({
          readOnly: true,
          accounts: {
            superAdmin: unused,
            admin: unused,
            viewer: { email: viewerEmail, password: viewerPassword },
            customer: unused,
          },
        });
      if (seeded.isFailure) {
        throw new Error(`Failed to seed E2E viewer: ${seeded.error.message}`);
      }
      viewer = await AuthTestHelper.login(http, {
        email: viewerEmail,
        password: viewerPassword,
      });
      const product = await E2eCatalogHelper.createProductWithStock(
        moduleRef,
        http,
        admin,
        1,
        'idor',
      );
      const cartId = await E2eCheckoutHelper.createCartWithItem(
        http,
        userB.accessToken,
        product.id,
      );
      const checkoutResponse = await E2eCheckoutHelper.checkout(
        http,
        userB,
        cartId,
      );
      expect(checkoutResponse.status).toBeLessThan(300);
      customerBOrderId = Number(checkoutResponse.body.orderId);
      expect(customerBOrderId).toBeGreaterThan(0);

      await E2eOrderHelper.waitForPaymentIntent(http, userB, customerBOrderId);
    }, 180_000);

    it('masks customer personal data for a viewer without view_customer_pii', async () => {
      const detail = await http
        .get(`${E2E_API_PREFIX}/orders/${customerBOrderId}`)
        .set(AuthTestHelper.bearer(viewer.accessToken));
      expect(detail.status).toBe(HttpStatus.OK);
      expect(Number(detail.body.id)).toBe(customerBOrderId);
      expect(detail.body.orderNumber).toEqual(expect.any(String));
      expect(detail.body.items.length).toBeGreaterThan(0);
      expect(detail.body.totalAmount).toEqual(expect.anything());
      expect(detail.body.status).toEqual(expect.any(String));
      expect(detail.body.userName).toMatch(/^Customer #\d+$/);
      expect(detail.body.userEmail).toMatch(/^.\*\*\*@\*\*\*/);
      expect(detail.body.userEmail).not.toBe(userB.email);
      expect(detail.body.shippingAddress).toBeNull();
      expect(JSON.stringify(detail.body)).not.toContain(userB.email);

      const list = await http
        .get(`${E2E_API_PREFIX}/orders`)
        .query({ limit: 100 })
        .set(AuthTestHelper.bearer(viewer.accessToken));
      expect(list.status).toBe(HttpStatus.OK);
      for (const item of list.body.items) {
        expect(item.userName).toMatch(/^Customer #\d+$/);
        expect(item.userEmail ?? '').not.toContain(userB.email);
      }

      const search = await http
        .get(`${E2E_API_PREFIX}/orders`)
        .query({ userEmail: userB.email })
        .set(AuthTestHelper.bearer(viewer.accessToken));
      expect(search.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('shows customer personal data to an admin with view_customer_pii', async () => {
      const detail = await http
        .get(`${E2E_API_PREFIX}/orders/${customerBOrderId}`)
        .set(AuthTestHelper.bearer(admin.accessToken));
      expect(detail.status).toBe(HttpStatus.OK);
      expect(detail.body.userEmail).toBe(userB.email);
      expect(detail.body.userName).not.toMatch(/^Customer #/);
      expect(detail.body.shippingAddress).toEqual(expect.any(String));
    });

    it('refuses a password change for the read-only viewer', async () => {
      await AuthTestHelper.changePassword(
        http,
        viewer.accessToken,
        viewerPassword,
        AuthTestHelper.rotatedPassword,
        HttpStatus.FORBIDDEN,
      );
    });

    it('refuses logout-all for the read-only viewer', async () => {
      const response = await http
        .post(`${E2E_API_PREFIX}/authentication/logout-all`)
        .set(AuthTestHelper.bearer(viewer.accessToken))
        .send({});
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it.each(['/users', '/payments'])(
      'refuses %s to the read-only viewer',
      async (path) => {
        const response = await http
          .get(`${E2E_API_PREFIX}${path}`)
          .set(AuthTestHelper.bearer(viewer.accessToken));
        expect(response.status).toBe(HttpStatus.FORBIDDEN);
      },
    );

    it('denies user reading a non-owned order id', async () => {
      const response = await getAs(userA, `/orders/${MISSING_ORDER_ID}`);

      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      HttpErrorAssertionHelper.assertErrorContract(response, {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: `Order with id ${MISSING_ORDER_ID} not found`,
      });
    });

    it('returns the missing-id not-found when reading another customers real order', async () => {
      const ownerRead = await getAs(userB, `/orders/${customerBOrderId}`);
      expect(ownerRead.status).toBe(HttpStatus.OK);
      expect(Number(ownerRead.body.id)).toBe(customerBOrderId);

      const missing = await getAs(userA, `/orders/${MISSING_ORDER_ID}`);
      const crossRead = await getAs(userA, `/orders/${customerBOrderId}`);

      expect(crossRead.status).toBe(missing.status);
      HttpErrorAssertionHelper.assertErrorContract(crossRead, {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: `Order with id ${customerBOrderId} not found`,
      });
      expect(Object.keys(crossRead.body).sort()).toEqual(
        Object.keys(missing.body).sort(),
      );
      expect(crossRead.body).not.toHaveProperty('items');
      expect(crossRead.body).not.toHaveProperty('userId');
      expect(crossRead.body).not.toHaveProperty('userEmail');
    });

    it('returns null when no payment exists for the requested order', async () => {
      const response = await getAs(
        userA,
        `/payments/orders/${MISSING_ORDER_ID}`,
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(isEmptyBody(response.body)).toBe(true);
    });

    it('returns the missing-id empty result for another customers real payment', async () => {
      const ownerRead = await getAs(
        userB,
        `/payments/orders/${customerBOrderId}`,
      );
      expect(ownerRead.status).toBe(HttpStatus.OK);
      expect(Number(ownerRead.body.orderId)).toBe(customerBOrderId);

      const crossRead = await getAs(
        userA,
        `/payments/orders/${customerBOrderId}`,
      );

      expect(crossRead.status).toBe(HttpStatus.OK);
      expect(isEmptyBody(crossRead.body)).toBe(true);
      expect(crossRead.text).not.toContain(
        String(ownerRead.body.gatewayPaymentIntentId),
      );
    });

    it('scopes order list to the authenticated user', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/orders`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBe(200);
      const orders = Array.isArray(response.body)
        ? response.body
        : response.body.items;
      expect(Array.isArray(orders)).toBe(true);

      const userIds: unknown[] = orders
        .map((order: { userId?: unknown }) => order.userId)
        .filter((userId: unknown) => userId != null);
      expect(userIds).toEqual(userIds.map(() => userA.userId));
    });
  });
});
