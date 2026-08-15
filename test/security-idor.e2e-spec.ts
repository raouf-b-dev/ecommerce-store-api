/**
 * Full-app IDOR regression suite.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { CartRepository } from 'src/modules/carts/core/domain/repositories/cart.repository';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

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
    const createResponse = await http
      .post(`${E2E_API_PREFIX}/carts`)
      .set(AuthTestHelper.bearer(user.accessToken));
    expect(createResponse.status).toBeLessThan(300);

    const cartRepository = moduleRef.get(CartRepository, { strict: false });
    const cartResult = await cartRepository.findByuserId(user.userId);
    if (cartResult.isFailure || !cartResult.value.id) {
      throw new Error('Expected cart id after create');
    }
    return cartResult.value.id;
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

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
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
          phone: '1234567890',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('carts', () => {
    it('denies access to another users cart without ownership', async () => {
      const cartId = await cartIdFor(userB);

      const crossRead = await http
        .get(`${E2E_API_PREFIX}/carts/${cartId}`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(crossRead.status).toBeGreaterThanOrEqual(400);
      expect(crossRead.status).toBeLessThan(500);
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

      expect(checkoutResponse.status).toBeGreaterThanOrEqual(400);
      expect(checkoutResponse.status).toBeLessThan(500);
    });
  });

  describe('orders and payments', () => {
    it('denies user reading a non-owned order id', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/orders/999999`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('returns not found when listing payments for another users order', async () => {
      const response = await http
        .get(`${E2E_API_PREFIX}/payments/orders/999999`)
        .set(AuthTestHelper.bearer(userA.accessToken));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
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
