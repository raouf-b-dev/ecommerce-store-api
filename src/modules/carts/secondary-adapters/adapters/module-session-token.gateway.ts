import { Injectable } from '@nestjs/common';
import { JwtSignerPort } from 'src/modules/auth/core/application/ports/jwt-signer.port';
import { CartSessionTokenGateway } from 'src/modules/carts/core/application/ports/session-token.gateway';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { JwtVerifierPort } from 'src/shared-kernel/domain/interfaces/jwt-verifier.port';
import { Result } from 'src/shared-kernel/domain/result';

@Injectable()
export class ModuleCartSessionTokenGateway implements CartSessionTokenGateway {
  constructor(
    private readonly jwtSignerPort: JwtSignerPort,
    private readonly jwtVerifierPort: JwtVerifierPort,
  ) {}

  async generateToken(
    cartId: number,
  ): Promise<Result<string, InfrastructureError>> {
    return Result.success(
      await this.jwtSignerPort.signCartSessionToken(cartId),
    );
  }

  async validateToken(
    token: string,
    cartId: number,
  ): Promise<Result<boolean, InfrastructureError>> {
    try {
      const payload = await this.jwtVerifierPort.verifyCartSessionToken(token);
      return Result.success(payload.cartId === cartId);
    } catch (error: any) {
      return Result.failure(new InfrastructureError(error.message));
    }
  }
}
