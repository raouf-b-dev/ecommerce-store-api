import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CheckStockUseCase } from '../../../application/check-stock/check-stock.usecase';
import { CheckStockResponse } from '../../dto/check-stock-response.dto';

@Injectable()
export class CheckStockController {
  constructor(private checkStockUseCase: CheckStockUseCase) {}
  async handle(
    productId: string,
    quantity?: number,
  ): Promise<Result<CheckStockResponse, ControllerError>> {
    try {
      const result = await this.checkStockUseCase.execute({
        productId,
        quantity,
      });
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
