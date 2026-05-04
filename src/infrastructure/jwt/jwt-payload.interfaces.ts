/**
 * Payload embedded in a verified refresh token.
 * Returned by JwtVerifierService.verifyRefreshToken().
 */
export interface RefreshTokenPayload {
  sub: number;
  sessionId: string;
  typ: string;
  iss: string;
  iat: number;
  exp: number;
}

/**
 * Payload embedded in a verified access token.
 * Returned by JwtVerifierService.verifyAccessToken().
 */
export interface AccessTokenPayload {
  sub: number;
  email: string;
  role: string;
  customerId: number | null;
  typ?: string;
  iss: string;
  iat: number;
  exp: number;
}
