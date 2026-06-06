import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
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
}
