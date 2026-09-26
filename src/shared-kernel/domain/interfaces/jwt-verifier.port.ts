// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
  VerifiedCartSessionPayload,
} from './jwt-payload.interface';

/**
 * Port for verifying JWT tokens.
 * Implemented by JwtVerifierService in the infrastructure layer.
 */
export abstract class JwtVerifierPort {
  abstract verifyAccessToken(
    token: string,
  ): Promise<VerifiedAccessTokenPayload>;
  abstract verifyRefreshToken(
    token: string,
  ): Promise<VerifiedRefreshTokenPayload>;
  abstract verifyCartSessionToken(
    token: string,
  ): Promise<VerifiedCartSessionPayload>;
}
