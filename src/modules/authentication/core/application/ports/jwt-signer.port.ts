/**
 * Input payload for signing an access token.
 * Contains the domain-level claims before JWT standard fields are added.
 */
export interface SignAccessTokenPayload {
  sub: string | null;
  email: string;
  role: string;
  /**
   * Only embedded when true. Absence of the claim means the credential was
   * clean at issue time, which lets MustChangePasswordGuard skip its database
   * lookup for the overwhelming majority of tokens.
   */
  mustChangePassword?: boolean;
}

export interface SignRefreshTokenPayload {
  sub: string | number;
  sid?: string;
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
  abstract signRefreshToken(payload: SignRefreshTokenPayload): Promise<string>;
  abstract signRefreshTokenWithSession(
    payload: Pick<SignRefreshTokenPayload, 'sub'>,
  ): Promise<RefreshTokenResult>;
  abstract signCartSessionToken(cartId: number): Promise<string>;
}
