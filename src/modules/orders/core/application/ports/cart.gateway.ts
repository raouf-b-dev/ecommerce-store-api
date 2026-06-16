import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CheckoutCartInfo } from '../../domain/interfaces/checkout-cart';
import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export abstract class CartGateway {
  abstract validateCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>>;
  abstract validateCartForCheckout(input: {
    cartId: number;
    callerContext: CallerContext | null;
    cartToken?: string | null;
  }): Promise<Result<CheckoutCartInfo, UseCaseError>>;
  abstract getCart(
    customerId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>>;
  abstract clearCart(
    cartId: number,
  ): Promise<Result<void, InfrastructureError>>;
}
