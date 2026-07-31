import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

export interface CreateCartUseCaseInput {
  callerContext: CallerContext | null;
}

export interface CreateCartResponse {
  cart: ICart;
}

@Injectable()
export class CreateCartUseCase extends UseCase<
  CreateCartUseCaseInput,
  CreateCartResponse,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(
    input: CreateCartUseCaseInput,
  ): Promise<Result<CreateCartResponse, UseCaseError>> {
    const { callerContext } = input;

    if (
      !callerContext ||
      callerContext.userId === null ||
      !callerContext.permissions.has('manage_own_cart')
    ) {
      return ErrorFactory.UseCaseError(
        'Not authorized to create a customer cart',
      );
    }

    // Check if the user already has a cart
    const existingResult = await this.cartRepository.findByuserId(
      callerContext.userId,
    );
    if (existingResult.isSuccess) {
      return Result.success({
        cart: existingResult.value.toPrimitives(),
      });
    }

    const createResult = await this.cartRepository.create({
      userId: callerContext.userId,
    });

    if (isFailure(createResult)) return createResult;

    return Result.success({
      cart: createResult.value.toPrimitives(),
    });
  }
}
