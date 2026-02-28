import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class RemoveCartItemUseCase extends UseCase<
  { cartId: number; itemId: number },
  ICart,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(input: {
    cartId: number;
    itemId: number;
  }): Promise<Result<ICart, UseCaseError>> {
    const { cartId, itemId } = input;
    try {
      const cartResult = await this.cartRepository.findById(cartId);

      if (isFailure(cartResult)) return cartResult;

      const cart = cartResult.value;
      if (!cart) {
        return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
      }

      const removeResult = cart.removeItemById(itemId);

      if (isFailure(removeResult)) return removeResult;

      const saveResult = await this.cartRepository.update(cart);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(cart.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
