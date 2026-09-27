import { HttpStatus } from '@nestjs/common';
import { PaymentMethodType } from 'src/shared-kernel/domain/value-objects/payment-method';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from './auth-test.helper';
import { E2eHttpClient } from './e2e-test-app.helper';

/** Matches Superagent `Response['headers']` - string values only. */
export type E2eResponseHeaders = { readonly [name: string]: string };

export interface CheckoutHttpResult {
  status: number;
  body: {
    orderId?: number;
    jobId?: string;
    status?: string;
    message?: string;
  };
  headers: E2eResponseHeaders;
  /** Case-insensitive lookup via Superagent `Response#get`. */
  getHeader(name: string): string | undefined;
}

export class E2eCheckoutHelper {
  static shippingAddress(
    customer: Pick<AuthSession, 'firstName' | 'lastName'>,
  ) {
    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      street: '1 Market Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      phone: '5551234567',
    };
  }

  static async createCart(
    http: E2eHttpClient,
    accessToken: string,
  ): Promise<{ id: number; items: unknown[] }> {
    const createResponse = await http
      .post(`${E2E_API_PREFIX}/carts`)
      .set(AuthTestHelper.bearer(accessToken));

    expect(createResponse.status).toBeLessThan(300);
    const id = Number(createResponse.body.id);
    expect(id).toBeGreaterThan(0);
    expect(Array.isArray(createResponse.body.items)).toBe(true);

    return { id, items: createResponse.body.items };
  }

  static async createCartWithItem(
    http: E2eHttpClient,
    accessToken: string,
    productId: number,
    quantity = 1,
  ): Promise<number> {
    const cart = await this.createCart(http, accessToken);

    const addResponse = await http
      .post(`${E2E_API_PREFIX}/carts/${cart.id}/items`)
      .set(AuthTestHelper.bearer(accessToken))
      .send({ productId, quantity });
    expect(addResponse.status).toBeLessThan(300);

    return cart.id;
  }

  static async checkout(
    http: E2eHttpClient,
    customer: AuthSession,
    cartId: number,
    options: {
      idempotencyKey?: string;
      includeShipping?: boolean;
      headers?: Record<string, string>;
      body?: Record<string, unknown>;
    } = {},
  ): Promise<CheckoutHttpResult> {
    const includeShipping = options.includeShipping !== false;
    const request = http
      .post(`${E2E_API_PREFIX}/orders/checkout`)
      .set(AuthTestHelper.bearer(customer.accessToken));

    if (options.headers) {
      request.set(options.headers);
    }

    const payload = options.body ?? {
      cartId,
      paymentMethod: PaymentMethodType.STRIPE,
      ...(includeShipping
        ? { shippingAddress: this.shippingAddress(customer) }
        : {}),
      ...(options.idempotencyKey
        ? { idempotencyKey: options.idempotencyKey }
        : {}),
    };

    const response = await request.send(payload);

    return {
      status: response.status,
      body: response.body,
      headers: response.headers,
      getHeader: (name) => response.get(name),
    };
  }

  static async listOrderCount(
    http: E2eHttpClient,
    accessToken: string,
  ): Promise<number> {
    const response = await http
      .get(`${E2E_API_PREFIX}/orders`)
      .set(AuthTestHelper.bearer(accessToken));
    expect(response.status).toBe(HttpStatus.OK);
    const listed = Array.isArray(response.body)
      ? response.body
      : response.body.items;
    expect(Array.isArray(listed)).toBe(true);
    return listed.length;
  }
}
