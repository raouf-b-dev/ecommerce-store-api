import { Injectable } from '@nestjs/common';
import { CartSessionTokenService } from '../../core/application/services/cart-session-token.service';
import { JwtSignerPort } from '../../core/application/ports/jwt-signer.port';
import { JwtVerifierPort } from '../../../../shared-kernel/domain/interfaces/jwt-verifier.port';

@Injectable()
export class JwtCartSessionTokenService implements CartSessionTokenService {
  constructor(
    private readonly jwtSignerPort: JwtSignerPort,
    private readonly jwtVerifierPort: JwtVerifierPort,
  ) {}

  async generateToken(cartId: number): Promise<string> {
    return this.jwtSignerPort.signCartSessionToken(cartId);
  }

  async validateToken(token: string, cartId: number): Promise<boolean> {
    try {
      const payload = await this.jwtVerifierPort.verifyCartSessionToken(token);
      return payload.cartId === cartId;
    } catch {
      return false;
    }
  }
}
