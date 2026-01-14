import { Injectable } from '@nestjs/common';
import { CartGateway } from '../../application/ports/cart.gateway';
import { GetCartUseCase } from '../../../carts/application/usecases/get-cart/get-cart.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { ICart } from '../../../carts/domain/interfaces/cart.interface';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { ErrorFactory } from '../../../../core/errors/error.factory';

@Injectable()
export class ModuleCartGateway implements CartGateway {
  constructor(private readonly getCartUseCase: GetCartUseCase) {}

  async validateCart(
    cartId: number,
  ): Promise<Result<ICart, InfrastructureError>> {
    const result = await this.getCartUseCase.execute(cartId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to validate cart',
        result.error,
      );
    }

    return Result.success(result.value);
  }

  async getCart(cartId: number): Promise<Result<ICart, InfrastructureError>> {
    const result = await this.getCartUseCase.execute(cartId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to get cart',
        result.error,
      );
    }

    return Result.success(result.value);
  }
}
