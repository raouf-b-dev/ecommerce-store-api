import { Injectable, UnauthorizedException } from '@nestjs/common';
import { errors, jwtVerify, JWTPayload } from 'jose';
import { JwksPort } from '../ports/jwks.port';
import { JwtVerifierPort } from '../ports/jwt-verifier.port';
import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
} from '../types/jwt-payload.types';

/** Verifier options shared across all token types. */
const VERIFY_OPTIONS = {
  issuer: 'ecommerce-api',
  clockTolerance: 30, // 30 seconds tolerance for network/clock skew
} as const;

@Injectable()
export class JwtVerifierService implements JwtVerifierPort {
  constructor(private readonly jwksService: JwksPort) {}

  async verifyAccessToken(token: string): Promise<VerifiedAccessTokenPayload> {
    const payload = await this.verify(token);

    if (payload.typ === 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    this.assertAccessTokenPayload(payload);
    return payload;
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<VerifiedRefreshTokenPayload> {
    const payload = await this.verify(token);

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    this.assertRefreshTokenPayload(payload);
    return payload;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Shared JWT signature + claims verification.
   * Delegates error classification to jose's typed error hierarchy.
   */
  private async verify(token: string): Promise<JWTPayload> {
    try {
      const publicKey = this.jwksService.getPublicKey();
      const { payload } = await jwtVerify(token, publicKey, VERIFY_OPTIONS);
      return payload;
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        throw new UnauthorizedException('Token has expired');
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Runtime assertion that narrows JWTPayload → VerifiedAccessTokenPayload.
   * Throws if required claims are missing or malformed.
   */
  private assertAccessTokenPayload(
    payload: JWTPayload,
  ): asserts payload is VerifiedAccessTokenPayload {
    if (
      typeof payload.sub !== 'string' ||
      typeof payload['email'] !== 'string' ||
      typeof payload['role'] !== 'string' ||
      typeof payload.iss !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Malformed access token payload');
    }
  }

  /**
   * Runtime assertion that narrows JWTPayload → VerifiedRefreshTokenPayload.
   * Throws if required claims are missing or malformed.
   */
  private assertRefreshTokenPayload(
    payload: JWTPayload,
  ): asserts payload is VerifiedRefreshTokenPayload {
    if (
      typeof payload.sub !== 'string' ||
      typeof payload['sessionId'] !== 'string' ||
      typeof payload['typ'] !== 'string' ||
      typeof payload.iss !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Malformed refresh token payload');
    }
  }
}
