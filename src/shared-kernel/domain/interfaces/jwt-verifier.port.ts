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
