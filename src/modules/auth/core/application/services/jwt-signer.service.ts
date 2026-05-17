import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../../../../config/env-config.service';
import { JwksPort } from '../../../../../infrastructure/jwt/ports/jwks.port';
import { importPKCS8, SignJWT, decodeJwt } from 'jose';
import * as crypto from 'crypto';
import {
  JwtSignerPort,
  SignAccessTokenPayload,
  RefreshTokenResult,
} from '../ports/jwt-signer.port';

@Injectable()
export class JwtSignerService implements JwtSignerPort {
  constructor(
    private readonly configService: EnvConfigService,
    private readonly jwksService: JwksPort,
  ) {}

  async signAccessToken(payload: SignAccessTokenPayload): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    // Transform domain types to JWT-compatible types (RFC 7519: sub is string)
    const { sub, ...rest } = payload;
    const jwtPayload = { ...rest, sub: String(sub) };

    return new SignJWT(jwtPayload)
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.jwksService.getKid(),
        typ: 'JWT',
      })
      .setIssuedAt()
      .setIssuer('ecommerce-api')
      .setExpirationTime(this.configService.jwt.accessTokenTtl)
      .sign(privateKey);
  }

  async signRefreshToken(payload: any): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    return new SignJWT({ ...payload, typ: 'refresh' })
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.jwksService.getKid(),
        typ: 'JWT',
      })
      .setIssuedAt()
      .setIssuer('ecommerce-api')
      .setExpirationTime(this.configService.jwt.refreshTokenTtl)
      .sign(privateKey);
  }

  /**
   * Signs a refresh token and generates all session metadata needed by the
   * application layer, keeping crypto/jose concerns inside the infrastructure.
   *
   * Returns the signed JWT, a unique sessionId, and the token's expiration Date.
   */
  async signRefreshTokenWithSession(
    payload: Record<string, unknown>,
  ): Promise<RefreshTokenResult> {
    const sessionId = crypto.randomUUID();

    const token = await this.signRefreshToken({
      ...payload,
      sessionId,
    });

    const decoded = decodeJwt(token);
    const expiresAt = new Date(decoded.exp! * 1000);

    return { token, sessionId, expiresAt };
  }
}
