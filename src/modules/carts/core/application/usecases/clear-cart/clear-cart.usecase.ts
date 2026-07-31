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

export interface ClearCartUseCaseInput {
  cartId: number;
  callerContext: CallerContext | null;
}

@Injectable()
export class ClearCartUseCase extends UseCase<
  ClearCartUseCaseInput,
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
    input: ClearCartUseCaseInput,
  ): Promise<Result<ICart, UseCaseError>> {
    const { cartId, callerContext } = input;
    const cartResult = await this.cartRepository.findById(cartId);

    if (isFailure(cartResult)) return cartResult;

    const cart = cartResult.value;
    if (!cart) {
      return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
    }

    const ownershipResult = await this.cartOwnershipValidator.validate(
      cart,
      callerContext,
    );

    if (isFailure(ownershipResult)) return ownershipResult;

    cart.clearItems();

    const saveResult = await this.cartRepository.update(cart);

    if (isFailure(saveResult)) return saveResult;

    return Result.success(cart.toPrimitives());
  }
}
