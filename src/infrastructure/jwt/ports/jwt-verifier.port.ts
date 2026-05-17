import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
} from '../types/jwt-payload.types';

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
}
