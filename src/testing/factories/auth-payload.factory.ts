import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
} from 'src/shared-kernel/domain/interfaces/jwt-payload.interface';
import {
  createUserCallerContext,
  SystemCallerContext,
  UserCallerContext,
} from 'src/shared-kernel/domain/interfaces/caller-context.interface';
import { TEST_IDS } from '../helpers/test-data.helper';

export class AuthPayloadFactory {
  static createSystemCallerContext(
    overrides: Partial<SystemCallerContext> = {},
  ): SystemCallerContext {
    return {
      kind: 'system',
      userId: TEST_IDS.user,
      role: 'SYSTEM',
      permissions: new Set([]),
      ...overrides,
    };
  }
  static createCallerContext(
    overrides: Partial<UserCallerContext> = {},
  ): UserCallerContext {
    return createUserCallerContext({
      userId: TEST_IDS.user,
      role: 'ADMIN',
      permissions: new Set([]),
      ...overrides,
    });
  }

  static createAdminContext(
    overrides: Partial<UserCallerContext> = {},
  ): UserCallerContext {
    return createUserCallerContext({
      userId: TEST_IDS.user,
      role: 'ADMIN',
      permissions: new Set(['manage_carts']),
      ...overrides,
    });
  }

  static createCustomerContext(
    overrides: Partial<UserCallerContext> = {},
  ): UserCallerContext {
    return createUserCallerContext({
      userId: 123,
      role: 'CUSTOMER',
      permissions: new Set(['manage_own_cart']),
      ...overrides,
    });
  }
  static createAccessTokenPayload(
    overrides: Partial<VerifiedAccessTokenPayload> = {},
  ): VerifiedAccessTokenPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: TEST_IDS.user.toString(),
      role: 'ADMIN',
      sid: 'session-123',
      email: 'test@example.com',
      typ: 'access',
      iss: 'test',
      iat: now,
      exp: now + 3600,
      ...overrides,
    };
  }

  static createRefreshTokenPayload(
    overrides: Partial<VerifiedRefreshTokenPayload> = {},
  ): VerifiedRefreshTokenPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: TEST_IDS.user.toString(),
      role: 'ADMIN',
      sid: 'session-123',
      typ: 'refresh',
      iss: 'test',
      iat: now,
      exp: now + 3600 * 24 * 7,
      ...overrides,
    };
  }
}
