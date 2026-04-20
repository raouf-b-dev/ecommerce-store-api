import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../config/env-config.service';
import { importPKCS8, SignJWT } from 'jose';

@Injectable()
export class JwtSignerService {
  constructor(private readonly configService: EnvConfigService) {}

  async signAccessToken(payload: any): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: '1', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer('ecommerce-api')
      .setExpirationTime(this.configService.jwt.accessTokenTtl)
      .sign(privateKey);
  }

  async signRefreshToken(payload: any): Promise<string> {
    const pem = this.configService.jwt.privateKey;
    const privateKey = await importPKCS8(pem, 'RS256');

    return new SignJWT({ ...payload, typ: 'refresh' })
      .setProtectedHeader({ alg: 'RS256', kid: '1', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer('ecommerce-api')
      .setExpirationTime(this.configService.jwt.refreshTokenTtl)
      .sign(privateKey);
  }
}
