import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class MergeCartsUseCase extends UseCase<
  { guestCartId: number; userCartId: number },
  ICart,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(input: {
    guestCartId: number;
    userCartId: number;
  }): Promise<Result<ICart, UseCaseError>> {
    const { guestCartId, userCartId } = input;
    try {
      const guestCartResult = await this.cartRepository.findById(guestCartId);
      if (isFailure(guestCartResult)) return guestCartResult;
      const guestCart = guestCartResult.value;

      const userCartResult = await this.cartRepository.findById(userCartId);
      if (isFailure(userCartResult)) return userCartResult;
      const userCart = userCartResult.value;

      if (!guestCart || !userCart) {
        return ErrorFactory.UseCaseError('One or both carts not found');
      }

      const mergeResult = userCart.mergeItems(guestCart.getItems());
      if (isFailure(mergeResult)) return mergeResult;

      const repoMergeResult = await this.cartRepository.mergeCarts(
        guestCart,
        userCart,
      );

      if (isFailure(repoMergeResult)) return repoMergeResult;

      return Result.success(repoMergeResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
