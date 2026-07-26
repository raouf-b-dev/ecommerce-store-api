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

@Injectable()
export class ModuleCartGateway implements CartGateway {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  async validateCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    return this.fetchAndTranslate(
      cartId,
      'validate',
      SYSTEM_CALLER_CONTEXT,
      null,
    );
  }

  async validateCartForCheckout(input: {
    cartId: number;
    callerContext: CallerContext | null;
    cartToken?: string | null;
  }): Promise<Result<CheckoutCartInfo, UseCaseError>> {
    const result = await this.getCartUseCase.execute({
      cartId: input.cartId,
      callerContext: input.callerContext,
      cartToken: input.cartToken ?? null,
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    return Result.success(this.toCheckoutCartInfo(result.value));
  }

  async getCart(
    cartId: number,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    return this.fetchAndTranslate(cartId, 'get', SYSTEM_CALLER_CONTEXT, null);
  }

  async clearCart(cartId: number): Promise<Result<void, InfrastructureError>> {
    const result = await this.clearCartUseCase.execute({
      cartId,
      callerContext: SYSTEM_CALLER_CONTEXT,
      cartToken: null,
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
    cartToken: string | null,
  ): Promise<Result<CheckoutCartInfo, InfrastructureError>> {
    const result = await this.getCartUseCase.execute({
      cartId,
      callerContext,
      cartToken,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        `Failed to ${operation} cart`,
        result.error,
      );
    }

    const cart = result.value;

    return Result.success(this.toCheckoutCartInfo(cart));
  }

  private toCheckoutCartInfo(cart: {
    id: number | null;
    userId: number | null;
    items?: Array<{
      productId: number;
      productName: string;
      price: number;
      quantity: number;
    }>;
  }): CheckoutCartInfo {
    return {
      id: cart.id,
      userId: cart.userId,
      items: (cart.items || []).map(
        (item): CheckoutCartItem => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
        }),
      ),
    };
  }
}
