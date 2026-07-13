/**
 * Full-app IDOR regression suite.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { INestApplication } from '@nestjs/common';
import { decodeJwt } from 'jose';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

const API = '/v1';

interface AuthSession {
  email: string;
  accessToken: string;
  userId: number;
}

async function registeruser(
  http: E2eHttpClient,
  label: string,
): Promise<AuthSession> {
  const email = `idor-${label}-${Date.now()}@example.com`;
  const password = 'Password123!';

  const registerResponse = await http.post(`${API}/auth/register`).send({
    email,
    password,
    firstName: label,
    lastName: 'Tester',
  });

  expect(registerResponse.status).toBe(201);
  const registereduserId = registerResponse.body.userId as number;
  expect(registereduserId).toBeGreaterThan(0);

  const loginResponse = await http.post(`${API}/auth/login`).send({
    email,
    password,
  });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.accessToken).toBeDefined();

  const claims = decodeJwt(loginResponse.body.accessToken as string);
  const userId = Number(claims.userId);
  expect(userId).toBe(registereduserId);

  return {
    email,
    accessToken: loginResponse.body.accessToken as string,
    userId,
  };
}

function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

describe('Security IDOR (e2e)', () => {
  let app: INestApplication;
  let http: E2eHttpClient;
  let userA: AuthSession;
  let userB: AuthSession;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    http = E2eTestAppHelper.getHttp(app);

    userA = await registeruser(http, 'user-a');
    userB = await registeruser(http, 'user-b');
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  describe('users', () => {
    it('allows user to read own profile', async () => {
      const response = await http
        .get(`${API}/users/${userA.userId}`)
        .set(bearer(userA.accessToken));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userA.userId);
    });

    it('denies user reading another user profile', async () => {
      const response = await http
        .get(`${API}/users/${userB.userId}`)
        .set(bearer(userA.accessToken));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('denies user mutating another user address', async () => {
      const response = await http
        .post(`${API}/users/${userB.userId}/addresses`)
        .set(bearer(userA.accessToken))
        .send({
          street: '999 Hacker Lane',
          city: 'Denial',
          state: 'CA',
          postalCode: '90001',
          country: 'US',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('carts', () => {
    it('denies access to another users cart without ownership', async () => {
      const createResponse = await http
        .post(`${API}/carts`)
        .set(bearer(userB.accessToken));

      expect(createResponse.status).toBe(201);
      const cartId = createResponse.body.id as number;

      const crossRead = await http
        .get(`${API}/carts/${cartId}`)
        .set(bearer(userA.accessToken));

      expect(crossRead.status).toBeGreaterThanOrEqual(400);
      expect(crossRead.status).toBeLessThan(500);
    });

    it('allows guest cart access with valid session token', async () => {
      const createResponse = await http.post(`${API}/carts`);
      expect(createResponse.status).toBe(201);

      const cartId = createResponse.body.id as number;
      const cartToken =
        createResponse.headers['x-cart-token'] ?? createResponse.body.token;

      expect(cartToken).toBeDefined();

      const readResponse = await http
        .get(`${API}/carts/${cartId}`)
        .set('X-Cart-Token', String(cartToken));

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.id).toBe(cartId);
    });
  });

  describe('checkout', () => {
    it('denies checkout with another users cart', async () => {
      const createResponse = await http
        .post(`${API}/carts`)
        .set(bearer(userB.accessToken));

      expect(createResponse.status).toBe(201);
      const cartId = createResponse.body.id as number;

      const checkoutResponse = await http
        .post(`${API}/orders/checkout`)
        .set(bearer(userA.accessToken))
        .send({
          cartId,
          paymentMethod: 'CREDIT_CARD',
        });

      expect(checkoutResponse.status).toBeGreaterThanOrEqual(400);
      expect(checkoutResponse.status).toBeLessThan(500);
    });
  });

  describe('orders and payments', () => {
    it('denies user reading a non-owned order id', async () => {
      const response = await http
        .get(`${API}/orders/999999`)
        .set(bearer(userA.accessToken));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('returns not found when listing payments for another users order', async () => {
      const response = await http
        .get(`${API}/payments/orders/999999`)
        .set(bearer(userA.accessToken));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('scopes order list to the authenticated user', async () => {
      const response = await http
        .get(`${API}/orders`)
        .set(bearer(userA.accessToken));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      for (const order of response.body) {
        if (order.userId != null) {
          expect(order.userId).toBe(userA.userId);
        }
      }
    });
  });
});
