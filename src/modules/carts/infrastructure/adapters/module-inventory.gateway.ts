import { Injectable } from '@nestjs/common';
import { InventoryGateway } from '../../application/ports/inventory.gateway';
import { CheckStockUseCase } from '../../../inventory/application/check-stock/check-stock.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { CheckStockResponse } from '../../../inventory/presentation/dto/check-stock-response.dto';
import { ErrorFactory } from '../../../../core/errors/error.factory';

@Injectable()
export class ModuleInventoryGateway implements InventoryGateway {
  constructor(private readonly checkStockUseCase: CheckStockUseCase) {}

  async checkStock(
    productId: number,
    quantity: number,
  ): Promise<Result<CheckStockResponse, InfrastructureError>> {
    const result = await this.checkStockUseCase.execute({
      productId,
      quantity,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to check stock',
        result.error,
      );
    }

    return Result.success(result.value);
  }
}
