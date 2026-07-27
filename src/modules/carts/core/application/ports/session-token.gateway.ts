import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error.js';
import { Result } from 'src/shared-kernel/domain/result';

export abstract class CartSessionTokenGateway {
  abstract generateToken(
    cartId: number,
  ): Promise<Result<string, InfrastructureError>>;
  abstract validateToken(
    token: string,
    cartId: number,
  ): Promise<Result<boolean, InfrastructureError>>;
}
