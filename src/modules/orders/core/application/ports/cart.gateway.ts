import { Result } from '../../../../../shared-kernel/domain/result';
import { ICart } from '../../../../carts/core/domain/interfaces/cart.interface';
import { InfrastructureError } from '../../../../../shared-kernel/errors/infrastructure-error';

export interface CartGateway {
  validateCart(cartId: number): Promise<Result<ICart, InfrastructureError>>;
  getCart(cartId: number): Promise<Result<ICart, InfrastructureError>>;
}
