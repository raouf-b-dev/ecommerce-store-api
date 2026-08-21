import {
  buildScopedIdempotencyKey,
  extractIdempotencyKey,
  getUnversionedRoutePath,
  IDEMPOTENCY_KEY_HEADER,
  X_IDEMPOTENCY_KEY_HEADER,
} from './request.helpers';
import {
  createMockRequest,
  createMockRequestWithUser,
  IdempotencyTestFactory,
} from '../../../testing';

describe('idempotency HTTP helpers', () => {
  describe('extractIdempotencyKey', () => {
    it('prefers Idempotency-Key over legacy header and body', () => {
      const clientKey = IdempotencyTestFactory.createClientKey('standard');
      const request = createMockRequest({
        headers: {
          [IDEMPOTENCY_KEY_HEADER]: clientKey,
          [X_IDEMPOTENCY_KEY_HEADER]: 'legacy-ignored',
        },
        body: { idempotencyKey: 'body-ignored' },
      });

      expect(extractIdempotencyKey(request)).toBe(clientKey);
    });

    it('falls back to x-idempotency-key when standard header is absent', () => {
      const clientKey = IdempotencyTestFactory.createClientKey('legacy');
      const request = createMockRequest({
        headers: IdempotencyTestFactory.createHeaders(clientKey, 'legacy'),
        body: { idempotencyKey: 'body-ignored' },
      });

      expect(extractIdempotencyKey(request)).toBe(clientKey);
    });

    it('falls back to body idempotencyKey', () => {
      const clientKey = IdempotencyTestFactory.createClientKey('body');
      const request = createMockRequest({
        headers: {},
        body: { idempotencyKey: clientKey },
      });

      expect(extractIdempotencyKey(request)).toBe(clientKey);
    });

    it('rejects blank header and body values', () => {
      const request = createMockRequest({
        headers: {
          [IDEMPOTENCY_KEY_HEADER]: '   ',
          [X_IDEMPOTENCY_KEY_HEADER]: '',
        },
        body: { idempotencyKey: '  ' },
      });

      expect(extractIdempotencyKey(request)).toBeUndefined();
    });

    it('reads the first value when a header is an array', () => {
      const clientKey = IdempotencyTestFactory.createClientKey('array');
      const request = createMockRequest({
        headers: {
          [IDEMPOTENCY_KEY_HEADER]: [clientKey, 'second'],
        },
      });

      expect(extractIdempotencyKey(request)).toBe(clientKey);
    });
  });

  describe('getUnversionedRoutePath', () => {
    it('strips the API version prefix from request.path', () => {
      const request = createMockRequest({
        path: '/v1/orders/checkout',
        route: undefined,
      });

      expect(getUnversionedRoutePath(request)).toBe('/orders/checkout');
    });

    it('prefers request.route.path when present', () => {
      const request = createMockRequest({
        path: '/v1/orders/checkout',
        route: { path: '/orders/checkout' },
      });

      expect(getUnversionedRoutePath(request)).toBe('/orders/checkout');
    });
  });

  describe('buildScopedIdempotencyKey', () => {
    it('namespaces with userId, method, and unversioned route', () => {
      const clientKey = IdempotencyTestFactory.createClientKey('scoped');
      const user = IdempotencyTestFactory.createCurrentUser({ userId: 42 });
      const request = createMockRequestWithUser(user, {
        method: 'post',
        path: '/v1/orders/checkout',
        route: { path: '/checkout' },
      });

      expect(buildScopedIdempotencyKey(request, clientKey)).toBe(
        IdempotencyTestFactory.createScopedKey({
          userId: 42,
          method: 'POST',
          route: '/orders/checkout',
          clientKey,
        }),
      );
    });

    it('falls back to route.path when request.path is absent', () => {
      const clientKey =
        IdempotencyTestFactory.createClientKey('route-fallback');
      const user = IdempotencyTestFactory.createCurrentUser({ userId: 7 });
      const request = createMockRequestWithUser(user, {
        method: 'POST',
        route: { path: '/orders/checkout' },
      });
      delete (request as { path?: string }).path;

      expect(buildScopedIdempotencyKey(request, clientKey)).toBe(
        IdempotencyTestFactory.createScopedKey({
          userId: 7,
          method: 'POST',
          route: '/orders/checkout',
          clientKey,
        }),
      );
    });

    it('uses anon when request.user is missing', () => {
      const clientKey = IdempotencyTestFactory.createClientKey('anon');
      const request = createMockRequest({
        method: 'POST',
        path: '/orders/checkout',
        route: { path: '/orders/checkout' },
      });

      expect(buildScopedIdempotencyKey(request, clientKey)).toBe(
        IdempotencyTestFactory.createScopedKey({
          userId: 'anon',
          method: 'POST',
          route: '/orders/checkout',
          clientKey,
        }),
      );
    });
  });
});
