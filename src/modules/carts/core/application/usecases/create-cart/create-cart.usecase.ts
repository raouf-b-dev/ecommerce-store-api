import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import { CreateCartDto } from '../../../../primary-adapters/dto/create-cart.dto';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';

@Injectable()
export class CreateCartUseCase extends UseCase<
  CreateCartDto,
  ICart,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(dto: CreateCartDto): Promise<Result<ICart, UseCaseError>> {
    try {
      const createResult = await this.cartRepository.create(dto);

      if (isFailure(createResult)) return createResult;

      return Result.success(createResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
