import { Result } from '../../../../core/domain/result';
import { ICart } from '../../../carts/domain/interfaces/cart.interface';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';

export interface CartGateway {
  validateCart(cartId: number): Promise<Result<ICart, InfrastructureError>>;
  getCart(cartId: number): Promise<Result<ICart, InfrastructureError>>;
}
