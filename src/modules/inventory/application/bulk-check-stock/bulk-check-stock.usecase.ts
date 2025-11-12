import { Injectable } from '@nestjs/common';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';

@Injectable()
export class BulkCheckStockUseCase
  implements
    UseCase<
      {
        items: Array<{ productId: string; quantity: number }>;
      },
      void,
      UseCaseError
    >
{
  constructor() {}

  async execute(dto: {
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<Result<void, UseCaseError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
