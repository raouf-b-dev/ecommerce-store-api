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

export interface GetCartInput {
  cartId: number;
  callerContext: CallerContext | null;
  cartToken: string | null;
}

@Injectable()
export class GetCartUseCase extends UseCase<GetCartInput, ICart, UseCaseError> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartOwnershipValidator: CartOwnershipValidator,
  ) {
    super();
  }

  async execute(input: GetCartInput): Promise<Result<ICart, UseCaseError>> {
    const cartResult = await this.cartRepository.findById(input.cartId);

    if (isFailure(cartResult)) return cartResult;

    if (!cartResult.value) {
      return ErrorFactory.UseCaseError(
        `Cart with id ${input.cartId} not found`,
      );
    }

    const ownershipResult = await this.cartOwnershipValidator.validate(
      cartResult.value,
      input.callerContext,
      input.cartToken,
    );

    if (isFailure(ownershipResult)) return ownershipResult;

    return Result.success(cartResult.value.toPrimitives());
  }
}
