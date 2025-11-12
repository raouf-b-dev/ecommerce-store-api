import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ReleaseStockUseCase } from '../../../application/release-stock/release-stock.usecase';

@Injectable()
export class ReleaseStockController {
  constructor(private releaseStockUseCase: ReleaseStockUseCase) {}
  async handle(reservationId: string): Promise<Result<void, ControllerError>> {
    try {
      const result = await this.releaseStockUseCase.execute(reservationId);
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
