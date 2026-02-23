import { Injectable } from '@nestjs/common';
import { InventoryGateway } from '../../core/application/ports/inventory.gateway';
import { CheckStockUseCase } from '../../../inventory/core/application/check-stock/check-stock.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/errors/infrastructure-error';
import { CheckStockResponse } from '../../../inventory/primary-adapters/dto/check-stock-response.dto';
import { ErrorFactory } from '../../../../shared-kernel/errors/error.factory';

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
