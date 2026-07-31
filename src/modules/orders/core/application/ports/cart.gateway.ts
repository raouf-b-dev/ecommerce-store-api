import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface CheckoutCartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

export interface CheckoutCartInfo {
  id: number | null;
  userId: number;
  items: CheckoutCartItem[];
}

export abstract class CartGateway {
  abstract validateCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>>;
  abstract validateCartForCheckout(input: {
    cartId: number;
    callerContext: CallerContext | null;
  }): Promise<Result<CheckoutCartInfo, UseCaseError>>;
  abstract getCart(
    userId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>>;
  abstract clearCart(
    cartId: number,
  ): Promise<Result<void, InfrastructureError>>;
}
