import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { importPKCS8, SignJWT } from 'jose';
import ms from 'ms';
import { EnvConfigService } from '../../../../config/env-config.service';
import { JwksPort } from '../../../../infrastructure/jwt/ports/jwks.port';
import {
  JwtSignerPort,
  RefreshTokenResult,
  SignAccessTokenPayload,
  SignRefreshTokenPayload,
} from '../../core/application/ports/jwt-signer.port';

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
    const { sub, mustChangePassword, ...rest } = payload;
    const jwtPayload = {
      ...rest,
      sub: String(sub),
      ...(mustChangePassword ? { mustChangePassword: true } : {}),
    };

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

  async signRefreshToken(payload: SignRefreshTokenPayload): Promise<string> {
    return this.signRefreshJwt(payload, this.refreshExpiresAt());
  }

  async signRefreshTokenWithSession(
    payload: Pick<SignRefreshTokenPayload, 'sub' | 'sid'>,
  ): Promise<RefreshTokenResult> {
    const sessionId = payload.sid ?? crypto.randomUUID();
    const expiresAt = this.refreshExpiresAt();
    const token = await this.signRefreshJwt(
      { sub: payload.sub, sid: sessionId },
      expiresAt,
    );

    return { token, sessionId, expiresAt };
  }

  async signCartSessionToken(cartId: number): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    return new SignJWT({ sub: 'guest', cartId, typ: 'cart_session' })
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.jwksService.getKid(),
        typ: 'JWT',
      })
      .setIssuedAt()
      .setIssuer('ecommerce-api')
      .setExpirationTime(this.configService.jwt.cartSessionTtl)
      .sign(privateKey);
  }

  private refreshExpiresAt(): Date {
    const expiresAtMs = Date.now() + ms(this.configService.jwt.refreshTokenTtl);
    return new Date(Math.floor(expiresAtMs / 1000) * 1000);
  }

  private async signRefreshJwt(
    payload: SignRefreshTokenPayload,
    expiration: Date,
  ): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    const jwtPayload = {
      sub: String(payload.sub),
      ...(payload.sid ? { sid: payload.sid } : {}),
      // Same sid, iat, and exp in one second would otherwise sign an identical token.
      jti: crypto.randomUUID(),
      typ: 'refresh',
    };

    return new SignJWT(jwtPayload)
      .setProtectedHeader({
        alg: 'RS256',
        kid: this.jwksService.getKid(),
        typ: 'JWT',
      })
      .setIssuedAt()
      .setIssuer('ecommerce-api')
      .setExpirationTime(expiration)
      .sign(privateKey);
  }
}
