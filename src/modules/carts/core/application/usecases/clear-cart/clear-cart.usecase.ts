import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { cartNotFoundError } from '../../services/cart-not-found';

export interface ClearCartUseCaseInput {
  cartId: number;
  callerContext: CallerContext | null;
}

@Injectable()
export class ClearCartUseCase extends UseCase<
  ClearCartUseCaseInput,
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
    input: ClearCartUseCaseInput,
  ): Promise<Result<void, UseCaseError>> {
    const { cartId, callerContext } = input;
    const cartResult = await this.cartRepository.findByIdForUpdate(cartId);

    if (isFailure(cartResult)) {
      if (cartResult.error.kind === ErrorKind.NOT_FOUND) {
        return cartNotFoundError(cartId);
      }
      return cartResult;
    }

    const { entity: cart, expectedVersion } = cartResult.value;
    if (!cart) {
      return cartNotFoundError(cartId);
    }

    const ownershipResult = this.cartOwnershipValidator.validate(
      cart,
      callerContext,
    );

    if (isFailure(ownershipResult)) return ownershipResult;

    cart.clearItems();

    const saveResult = await this.cartRepository.save(cart, expectedVersion);

    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
