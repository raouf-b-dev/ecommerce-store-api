import type { Request } from 'express';

/** Express lowercases incoming header names. */
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

const API_VERSION_PREFIX = /^\/v\d+/;
const ANON_USER_SEGMENT = 'anon';

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readHeaderValue(
  request: Request,
  headerName: string,
): string | undefined {
  const raw = request.headers[headerName];
  if (Array.isArray(raw)) {
    return asNonEmptyString(raw[0]);
  }
  return asNonEmptyString(raw);
}

/**
 * Client idempotency key:
 * `Idempotency-Key` header is the only source.
 */
export function extractIdempotencyKey(request: Request): string | undefined {
  return readHeaderValue(request, IDEMPOTENCY_KEY_HEADER);
}

export function getUnversionedRoutePath(request: Request): string {
  const routePath = request.route?.path;
  const rawPath =
    typeof routePath === 'string'
      ? routePath
      : typeof request.path === 'string'
        ? request.path
        : '';

  return rawPath.replace(API_VERSION_PREFIX, '');
}

function resolveUserSegment(request: Request): string {
  // `user` comes from express-serve-static-core augmentation in src/types/express.ts
  const userId = request.user?.userId;
  return typeof userId === 'number' && Number.isFinite(userId)
    ? String(userId)
    : ANON_USER_SEGMENT;
}

function resolveScopedRoutePath(request: Request): string {
  // Prefer the full request path so Nest mount shapes become `/orders/checkout`,
  // not a controller-relative `/checkout`. Fall back to route.path helpers.
  if (typeof request.path === 'string' && request.path.length > 0) {
    return request.path.replace(API_VERSION_PREFIX, '') || '/';
  }
  return getUnversionedRoutePath(request) || '/';
}

/**
 * Storage key passed to {@link IdempotencyStore} (store still prefixes `idempotency:`).
 * Shape: `{userId|anon}:{METHOD}:{unversionedRoute}:{clientKey}`
 */
export function buildScopedIdempotencyKey(
  request: Request,
  clientKey: string,
): string {
  const method = (request.method ?? 'UNKNOWN').toUpperCase();
  const route = resolveScopedRoutePath(request);
  const userSegment = resolveUserSegment(request);
  return `${userSegment}:${method}:${route}:${clientKey}`;
}
