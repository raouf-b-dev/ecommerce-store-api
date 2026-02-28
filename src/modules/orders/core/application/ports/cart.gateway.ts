import { Result } from '../../../../../shared-kernel/domain/result';
import { ICart } from '../../../../carts/core/domain/interfaces/cart.interface';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface CartGateway {
  validateCart(cartId: number): Promise<Result<ICart, InfrastructureError>>;
  getCart(cartId: number): Promise<Result<ICart, InfrastructureError>>;
}
