import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { CreateCartInput } from '../../../domain/repositories/cart.repository';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';

@Injectable()
export class CreateCartUseCase extends UseCase<
  CreateCartInput,
  ICart,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(input: CreateCartInput): Promise<Result<ICart, UseCaseError>> {
    const createResult = await this.cartRepository.create(input);

    if (isFailure(createResult)) return createResult;

    return Result.success(createResult.value.toPrimitives());
  }
}
