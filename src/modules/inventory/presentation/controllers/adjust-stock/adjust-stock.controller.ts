import { Injectable } from '@nestjs/common';
import { AdjustStockDto } from '../../dto/adjust-stock.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { AdjustStockUseCase } from '../../../application/adjust-stock/adjust-stock.usecase';
import { IInventory } from '../../../domain/interfaces/inventory.interface';

@Injectable()
export class AdjustStockController {
  constructor(private adjustStockUseCase: AdjustStockUseCase) {}
  async handle(
    productId: string,
    dto: AdjustStockDto,
  ): Promise<Result<IInventory, ControllerError>> {
    try {
      const result = await this.adjustStockUseCase.execute({ productId, dto });
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
