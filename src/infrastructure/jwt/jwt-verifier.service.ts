import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { JwksService } from './jwks.service';

@Injectable()
export class JwtVerifierService {
  constructor(private readonly jwksService: JwksService) {}

  async verifyAccessToken(token: string): Promise<any> {
    try {
      const publicKey = this.jwksService.getPublicKey();

      const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'ecommerce-api',
        clockTolerance: 30, // 30 seconds tolerance for Network/Clock skew
      });

      // Ensure it's not a refresh token being used as an access token
      if (payload.typ === 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error: any) {
      if (error?.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
