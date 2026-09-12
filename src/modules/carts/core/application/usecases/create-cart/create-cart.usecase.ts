import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Cart } from '../../../domain/entities/cart';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class CreateCartUseCase extends UseCase<
  CallerContext | null,
  ICart,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(
    callerContext: CallerContext | null,
  ): Promise<Result<ICart, UseCaseError>> {
    if (
      !callerContext ||
      callerContext.userId === null ||
      !callerContext.permissions.has('manage_own_cart')
    ) {
      return ErrorFactory.UseCaseError(
        'Not authorized to create a customer cart',
      );
    }

    const userId = callerContext.userId;
    const existingResult = await this.cartRepository.findByuserId(userId);
    if (existingResult.isSuccess) {
      return Result.success<ICart>(existingResult.value.toPrimitives());
    }

    const cart = Cart.createUserCart(userId);
    const saveResult = await this.cartRepository.save(cart);
    if (isFailure(saveResult)) return saveResult;

    if (saveResult.value.id === null) {
      return ErrorFactory.UseCaseError(
        `Cart for user ${userId} not found after persist`,
      );
    }

    return Result.success<ICart>(saveResult.value.toPrimitives());
  }
}
