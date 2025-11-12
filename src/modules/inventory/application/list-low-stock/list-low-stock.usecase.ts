import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { LowStockQueryDto } from '../../presentation/dto/low-stock-query.dto';

@Injectable()
export class ListLowStockUseCase
  implements UseCase<LowStockQueryDto, void, UseCaseError>
{
  constructor() {}

  async execute(query: LowStockQueryDto): Promise<Result<void, UseCaseError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
