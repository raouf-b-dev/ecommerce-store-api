import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { CheckoutCartInfo } from '../../domain/interfaces/checkout-cart';
export {
  CheckoutCartInfo,
  CheckoutCartItem,
} from '../../domain/interfaces/checkout-cart';

export abstract class CartGateway {
  abstract validateCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>>;
  abstract getCart(
    customerId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>>;
  abstract clearCart(
    cartId: number,
  ): Promise<Result<void, InfrastructureError>>;
}
