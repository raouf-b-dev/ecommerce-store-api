import { Injectable } from '@nestjs/common';
import {
  CartGateway,
  CheckoutCartInfo,
  CheckoutCartItem,
} from '../../core/application/ports/cart.gateway';
import { GetCartUseCase } from '../../../carts/core/application/usecases/get-cart/get-cart.usecase';
import { ClearCartUseCase } from '../../../carts/core/application/usecases/clear-cart/clear-cart.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleCartGateway implements CartGateway {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  async validateCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    return this.fetchAndTranslate(cartId, 'validate');
  }

  async getCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    return this.fetchAndTranslate(cartId, 'get');
  }

  async clearCart(cartId: number): Promise<Result<void, InfrastructureError>> {
    const result = await this.clearCartUseCase.execute(cartId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to clear cart',
        result.error,
      );
    }

    return Result.success(undefined);
  }

  private async fetchAndTranslate(
    cartId: number,
    operation: string,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    const result = await this.getCartUseCase.execute(cartId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        `Failed to ${operation} cart`,
        result.error,
      );
    }

    const cart = result.value;

    // Translate upstream Cart → downstream CheckoutCartInfo
    const cartInfo: CheckoutCartInfo = {
      id: cart.id,
      customerId: cart.customerId,
      items: (cart.items || []).map(
        (item): CheckoutCartItem => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
        }),
      ),
    };

    return Result.success(cartInfo);
  }
}
