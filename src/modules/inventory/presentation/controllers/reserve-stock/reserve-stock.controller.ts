import { Injectable } from '@nestjs/common';
import { ReserveStockDto } from '../../dto/reserve-stock.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ReserveStockUseCase } from '../../../application/reserve-stock/reserve-stock.usecase';

@Injectable()
export class ReserveStockController {
  constructor(private reserveStockUseCase: ReserveStockUseCase) {}
  async handle(dto: ReserveStockDto): Promise<Result<void, ControllerError>> {
    try {
      const result = await this.reserveStockUseCase.execute(dto);
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
