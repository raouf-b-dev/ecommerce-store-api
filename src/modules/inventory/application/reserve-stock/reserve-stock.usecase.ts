import { Injectable } from '@nestjs/common';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { ReserveStockDto } from '../../presentation/dto/reserve-stock.dto';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';
@Injectable()
export class ReserveStockUseCase
  implements UseCase<ReserveStockDto, void, UseCaseError>
{
  constructor() {}

  async execute(dto: ReserveStockDto): Promise<Result<void, UseCaseError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
