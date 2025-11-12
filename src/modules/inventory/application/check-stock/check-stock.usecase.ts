import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { Result } from '../../../../core/domain/result';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';

@Injectable()
export class CheckStockUseCase
  implements
    UseCase<{ productId: string; quantity?: number }, void, UseCaseError>
{
  constructor() {}

  async execute(dto: {
    productId: string;
    quantity?: number;
  }): Promise<Result<void, UseCaseError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
