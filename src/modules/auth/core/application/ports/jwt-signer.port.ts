/**
 * Input payload for signing an access token.
 * Contains the domain-level claims before JWT standard fields are added.
 */
export interface SignAccessTokenPayload {
  sub: number | null;
  email: string;
  role: string;
  customerId: number | null;
}

/**
 * Result of signing a refresh token with session metadata.
 */
export interface RefreshTokenResult {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

/**
 * Port for signing JWT tokens.
 * Implemented by JwtSignerService in the infrastructure layer.
 */
export abstract class JwtSignerPort {
  abstract signAccessToken(payload: SignAccessTokenPayload): Promise<string>;
  abstract signRefreshToken(payload: Record<string, unknown>): Promise<string>;
  abstract signRefreshTokenWithSession(
    payload: Record<string, unknown>,
  ): Promise<RefreshTokenResult>;
}
