import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class ClearCartUseCase extends UseCase<number, ICart, UseCaseError> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(cartId: number): Promise<Result<ICart, UseCaseError>> {
    try {
      const cartResult = await this.cartRepository.findById(cartId);

      if (isFailure(cartResult)) return cartResult;

      const cart = cartResult.value;
      if (!cart) {
        return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
      }

      cart.clearItems();

      const saveResult = await this.cartRepository.update(cart);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(cart.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
