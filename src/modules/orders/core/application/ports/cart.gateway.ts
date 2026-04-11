import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

// Downstream-specific DTO — Orders never sees the full Cart entity
export interface CheckoutCartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

export interface CheckoutCartInfo {
  id: number | null;
  customerId: number | null;
  items: CheckoutCartItem[];
}

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
