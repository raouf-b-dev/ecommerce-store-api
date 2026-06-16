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
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';

export interface MergeCartsUseCaseInput {
  guestCartId: number;
  userCartId: number;
  callerContext: CallerContext | null;
  cartToken: string | null;
}

@Injectable()
export class MergeCartsUseCase extends UseCase<
  MergeCartsUseCaseInput,
  ICart,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartOwnershipValidator: CartOwnershipValidator,
  ) {
    super();
  }

  async execute(
    input: MergeCartsUseCaseInput,
  ): Promise<Result<ICart, UseCaseError>> {
    const { guestCartId, userCartId, callerContext, cartToken } = input;
    const guestCartResult = await this.cartRepository.findById(guestCartId);
    if (isFailure(guestCartResult)) return guestCartResult;
    const guestCart = guestCartResult.value;

    const userCartResult = await this.cartRepository.findById(userCartId);
    if (isFailure(userCartResult)) return userCartResult;
    const userCart = userCartResult.value;

    if (!guestCart || !userCart) {
      return ErrorFactory.UseCaseError('One or both carts not found');
    }

    // Validate ownership of both carts
    const userCartOwnership = await this.cartOwnershipValidator.validate(
      userCart,
      callerContext,
      null, // user carts don't use guest cart tokens
    );
    if (isFailure(userCartOwnership)) return userCartOwnership;

    const guestCartOwnership = await this.cartOwnershipValidator.validate(
      guestCart,
      callerContext,
      cartToken,
    );
    if (isFailure(guestCartOwnership)) return guestCartOwnership;

    const mergeResult = userCart.mergeItems(guestCart.getItems());
    if (isFailure(mergeResult)) return mergeResult;

    const repoMergeResult = await this.cartRepository.mergeCarts(
      guestCart,
      userCart,
    );

    if (isFailure(repoMergeResult)) return repoMergeResult;

    return Result.success(repoMergeResult.value.toPrimitives());
  }
}
