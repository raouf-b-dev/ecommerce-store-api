import type { Request } from 'express';
import { isRecord } from '../lang/is-record';

/** Express lowercases incoming header names. */
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
export const X_IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';

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
 * Client idempotency key precedence:
 * `Idempotency-Key` → `x-idempotency-key` → body `idempotencyKey`.
 */
export function extractIdempotencyKey(request: Request): string | undefined {
  const standard = readHeaderValue(request, IDEMPOTENCY_KEY_HEADER);
  if (standard) {
    return standard;
  }

  const legacy = readHeaderValue(request, X_IDEMPOTENCY_KEY_HEADER);
  if (legacy) {
    return legacy;
  }

  const body: unknown = request.body;
  if (isRecord(body)) {
    return asNonEmptyString(body.idempotencyKey);
  }

  return undefined;
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
