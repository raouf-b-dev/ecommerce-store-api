// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Request } from 'express';

/**
 * Extracts a Bearer token from the request's Authorization header.
 * Returns the token if found, otherwise undefined.
 */
export function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type?.toLowerCase() === 'bearer' ? token : undefined;
}
