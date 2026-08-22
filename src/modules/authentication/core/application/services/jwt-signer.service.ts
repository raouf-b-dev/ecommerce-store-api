import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../../../../config/env-config.service';
import { JwksPort } from '../../../../../infrastructure/jwt/ports/jwks.port';
import { importPKCS8, SignJWT, decodeJwt } from 'jose';
import * as crypto from 'crypto';
import {
  JwtSignerPort,
  RefreshTokenResult,
  SignAccessTokenPayload,
  SignRefreshTokenPayload,
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

  async signRefreshToken(payload: SignRefreshTokenPayload): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    const jwtPayload = {
      sub: String(payload.sub),
      ...(payload.sid ? { sid: payload.sid } : {}),
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
    payload: Pick<SignRefreshTokenPayload, 'sub'>,
  ): Promise<RefreshTokenResult> {
    const sessionId = crypto.randomUUID();

    const token = await this.signRefreshToken({
      ...payload,
      sid: sessionId,
    });

    const decoded = decodeJwt(token);
    const expiresAt = new Date(decoded.exp! * 1000);

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
}
