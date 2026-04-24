import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../config/env-config.service';
import { JwksService } from './jwks.service';
import { importPKCS8, SignJWT, decodeJwt } from 'jose';
import * as crypto from 'crypto';

export interface RefreshTokenResult {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

@Injectable()
export class JwtSignerService {
  constructor(
    private readonly configService: EnvConfigService,
    private readonly jwksService: JwksService,
  ) {}

  async signAccessToken(payload: any): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    return new SignJWT(payload)
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
