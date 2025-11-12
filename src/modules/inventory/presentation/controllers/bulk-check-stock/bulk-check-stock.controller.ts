import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { BulkCheckStockUseCase } from '../../../application/bulk-check-stock/bulk-check-stock.usecase';

@Injectable()
export class BulkCheckStockController {
  constructor(private bulkCheckStockUseCase: BulkCheckStockUseCase) {}
  async handle(dto: {
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<Result<void, ControllerError>> {
    try {
      const result = await this.bulkCheckStockUseCase.execute(dto);
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
