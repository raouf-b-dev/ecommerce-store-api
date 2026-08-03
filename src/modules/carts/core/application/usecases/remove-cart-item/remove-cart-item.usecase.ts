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

export interface RemoveCartItemUseCaseInput {
  cartId: number;
  itemId: number;
  callerContext: CallerContext | null;
}

@Injectable()
export class RemoveCartItemUseCase extends UseCase<
  RemoveCartItemUseCaseInput,
  void,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartOwnershipValidator: CartOwnershipValidator,
  ) {
    super();
  }

  async execute(
    input: RemoveCartItemUseCaseInput,
  ): Promise<Result<void, UseCaseError>> {
    const { cartId, itemId, callerContext } = input;
    const cartResult = await this.cartRepository.findByIdForUpdate(cartId);

    if (isFailure(cartResult)) return cartResult;

    const { entity: cart, expectedVersion } = cartResult.value;
    if (!cart) {
      return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
    }

    const ownershipResult = await this.cartOwnershipValidator.validate(
      cart,
      callerContext,
    );

    if (isFailure(ownershipResult)) return ownershipResult;

    const removeResult = cart.removeItemById(itemId);

    if (isFailure(removeResult)) return removeResult;

    const saveResult = await this.cartRepository.save(cart, expectedVersion);

    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
