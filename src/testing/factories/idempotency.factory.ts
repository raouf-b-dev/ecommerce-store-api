import {
  IDEMPOTENCY_KEY_HEADER,
  X_IDEMPOTENCY_KEY_HEADER,
} from '../../shared-kernel/infra/http/request.helpers';
import { CurrentUserPayload } from '../../shared-kernel/domain/interfaces/current-user.interface';
import { TEST_IDS } from '../helpers/test-data.helper';

export type IdempotencyHeaderVariant = 'standard' | 'legacy';

export interface ScopedIdempotencyKeyInput {
  userId?: number | 'anon';
  method?: string;
  route?: string;
  clientKey: string;
}

export class IdempotencyTestFactory {
  static createClientKey(label = 'key'): string {
    return `idem-${label}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  static createCurrentUser(
    overrides: Partial<CurrentUserPayload> = {},
  ): CurrentUserPayload {
    return {
      userId: TEST_IDS.user,
      email: 'idempotency@example.com',
      role: 'CUSTOMER',
      ...overrides,
    };
  }

  static createHeaders(
    clientKey: string,
    variant: IdempotencyHeaderVariant = 'standard',
  ): Record<string, string> {
    if (variant === 'legacy') {
      return { [X_IDEMPOTENCY_KEY_HEADER]: clientKey };
    }
    return { [IDEMPOTENCY_KEY_HEADER]: clientKey };
  }

  static createScopedKey(input: ScopedIdempotencyKeyInput): string {
    const userSegment =
      input.userId === undefined ? String(TEST_IDS.user) : String(input.userId);
    const method = (input.method ?? 'POST').toUpperCase();
    const route = input.route ?? '/orders/checkout';
    return `${userSegment}:${method}:${route}:${input.clientKey}`;
  }
}
