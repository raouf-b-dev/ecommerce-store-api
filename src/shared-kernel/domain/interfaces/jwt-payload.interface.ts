import { JWTPayload } from 'jose';

/**
 * Payload embedded in a verified access token.
 * Returned by JwtVerifierPort.verifyAccessToken().
 */
export interface VerifiedAccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  typ?: string;
  iss: string;
  iat: number;
  exp: number;
}

/**
 * Payload embedded in a verified refresh token.
 * Returned by JwtVerifierPort.verifyRefreshToken().
 */
export interface VerifiedRefreshTokenPayload extends JWTPayload {
  sub: string;
  sessionId: string;
  typ: string;
  iss: string;
  iat: number;
  exp: number;
}

/**
 * Payload embedded in a verified cart session token.
 * Returned by JwtVerifierPort.verifyCartSessionToken().
 */
export interface VerifiedCartSessionPayload extends JWTPayload {
  sub: string;
  cartId: number;
  typ: string;
  iss: string;
  iat: number;
  exp: number;
}
