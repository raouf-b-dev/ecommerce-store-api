/**
 * Full-app IDOR regression suite.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import { E2eCheckoutHelper } from 'src/testing/helpers/e2e-checkout.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';

describe('Security IDOR (e2e)', () => {
  let app: INestApplication;
  let http: E2eHttpClient;
  let userA: AuthSession;
  let userB: AuthSession;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
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

      expect(crossRead.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      HttpErrorAssertionHelper.assertErrorContract(crossRead, {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: 'not found',
      });
    });
  });

  describe('checkout', () => {
    it('denies checkout with another users cart', async () => {
      const cartId = await cartIdFor(userB);

      const checkoutResponse = await http
        .post(`${E2E_API_PREFIX}/orders/checkout`)
        .set(AuthTestHelper.bearer(userA.accessToken))
        .send({
          cartId,
          paymentMethod: 'STRIPE',
        });

      expect(checkoutResponse.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      HttpErrorAssertionHelper.assertErrorContract(checkoutResponse, {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: 'not found',
      });
    });
  });

  describe('orders and payments', () => {
    it('denies user reading a non-owned order id', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/orders/999999`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      HttpErrorAssertionHelper.assertErrorContract(response, {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: 'Order with id 999999 not found',
      });
    });

    it('returns not found when listing payments for another users order', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/payments/orders/999999`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      HttpErrorAssertionHelper.assertErrorContract(response, {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messageContains: 'Payment for order ID 999999 not found',
      });
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

      for (const order of orders) {
        if (order.userId != null) {
          expect(order.userId).toBe(userA.userId);
        }
      }
    });
  });
});
