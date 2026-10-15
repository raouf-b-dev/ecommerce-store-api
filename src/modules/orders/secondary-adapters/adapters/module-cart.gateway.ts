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
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CallerContext } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

import { CartPresentationDTO } from '../../../carts/core/application/queries/results/cart-presentation.result';

@Injectable()
export class ModuleCartGateway implements CartGateway {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  async validateCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    return this.fetchAndTranslate(cartId, 'validate', SYSTEM_CALLER_CONTEXT);
  }

  async validateCartForCheckout(input: {
    cartId: number;
    callerContext: CallerContext | null;
  }): Promise<Result<CheckoutCartInfo, UseCaseError>> {
    const result = await this.getCartUseCase.execute({
      cartId: input.cartId,
      callerContext: input.callerContext,
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    return this.toCheckoutCartInfo(result.value);
  }

  async getCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    return this.fetchAndTranslate(cartId, 'get', SYSTEM_CALLER_CONTEXT);
  }

  async clearCart(cartId: number): Promise<Result<void, InfrastructureError>> {
    const result = await this.clearCartUseCase.execute({
      cartId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

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
    callerContext: CallerContext | null,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    const result = await this.getCartUseCase.execute({
      cartId,
      callerContext,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        `Failed to ${operation} cart`,
        result.error,
      );
    }

    return this.toCheckoutCartInfo(result.value);
  }

  private toCheckoutCartInfo(
    cart: CartPresentationDTO,
  ): Result<CheckoutCartInfo, InfrastructureError> {
    const items: CheckoutCartItem[] = [];

    for (const item of cart.items || []) {
      const currency = item.currency?.trim().toUpperCase();
      if (!currency) {
        return ErrorFactory.InfrastructureError(
          `Cart item "${item.productName}" is missing a currency`,
        );
      }

      const moneyResult = Money.fromMajorUnits(item.price, currency);
      if (isFailure(moneyResult)) {
        return ErrorFactory.InfrastructureError(
          `Invalid money for cart item "${item.productName}": ${moneyResult.error.message}`,
          moneyResult.error,
        );
      }

      items.push({
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        price: moneyResult.value.amount,
        quantity: item.quantity,
        currency,
      });
    }

    return Result.success({
      id: cart.id,
      userId: cart.userId,
      items,
    });
  }
}
