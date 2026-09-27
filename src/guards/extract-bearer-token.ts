import { Request } from 'express';

/**
 * Extracts a Bearer token from the request's Authorization header.
 * Returns the token if found, otherwise undefined.
 */
export function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type?.toLowerCase() === 'bearer' ? token : undefined;
}
