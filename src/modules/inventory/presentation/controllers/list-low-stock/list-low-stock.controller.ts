import { Injectable } from '@nestjs/common';
import { LowStockQueryDto } from '../../dto/low-stock-query.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ListLowStockUseCase } from '../../../application/list-low-stock/list-low-stock.usecase';
import { IInventory } from '../../../domain/interfaces/inventory.interface';

@Injectable()
export class ListLowStockController {
  constructor(private listLowStockUseCase: ListLowStockUseCase) {}
  async handle(
    query: LowStockQueryDto,
  ): Promise<Result<IInventory[], ControllerError>> {
    try {
      const result = await this.listLowStockUseCase.execute(query);
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
