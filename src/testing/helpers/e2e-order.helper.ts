import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from './auth-test.helper';
import { E2eHttpClient } from './e2e-test-app.helper';
import { pollUntil } from './poll.helper';

export class E2eOrderHelper {
  static async waitForOrderStatus(
    http: E2eHttpClient,
    customer: AuthSession,
    orderId: number,
    status: string,
    options: { timeoutMs?: number } = {},
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
        timeoutMs: options.timeoutMs ?? 90_000,
      },
    );
  }

  static async waitForPaymentIntent(
    http: E2eHttpClient,
    customer: AuthSession,
    orderId: number,
    options: { timeoutMs?: number } = {},
  ): Promise<{
    gatewayPaymentIntentId: string;
    reservationId: string;
  }> {
    return pollUntil(
      async () => {
        const response = await http
          .get(`${E2E_API_PREFIX}/payments/orders/${orderId}`)
          .set(AuthTestHelper.bearer(customer.accessToken));
        if (response.status !== 200) {
          return null;
        }
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
      {
        description: `payment intent for order ${orderId}`,
        timeoutMs: options.timeoutMs ?? 90_000,
      },
    );
  }
}
