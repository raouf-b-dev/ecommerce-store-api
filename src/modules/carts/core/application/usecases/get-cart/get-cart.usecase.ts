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
export class GetCartUseCase extends UseCase<number, ICart, UseCaseError> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(id: number): Promise<Result<ICart, UseCaseError>> {
    try {
      const cartResult = await this.cartRepository.findById(id);

      if (isFailure(cartResult)) return cartResult;

      if (!cartResult.value) {
        return ErrorFactory.UseCaseError(`Cart with id ${id} not found`);
      }

      return Result.success(cartResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
