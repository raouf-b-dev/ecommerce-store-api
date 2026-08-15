import type { Request } from 'express';

const API_VERSION_PREFIX = /^\/v\d+/;

export function extractIdempotencyKey(request: Request): string | undefined {
  const headerKey = request.headers['x-idempotency-key'];
  if (typeof headerKey === 'string') {
    return headerKey;
  }

  const body = request.body;
  if (typeof body === 'object' && body !== null && 'idempotencyKey' in body) {
    const bodyKey = body.idempotencyKey;
    if (typeof bodyKey === 'string') {
      return bodyKey;
    }
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
