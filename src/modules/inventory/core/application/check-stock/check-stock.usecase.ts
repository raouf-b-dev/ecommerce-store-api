import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { CheckStockResponse } from '../../../primary-adapters/dto/check-stock-response.dto';

@Injectable()
export class CheckStockUseCase
  implements
    UseCase<
      { productId: number; quantity?: number },
      CheckStockResponse,
      UseCaseError
    >
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(dto: {
    productId: number;
    quantity?: number;
  }): Promise<Result<CheckStockResponse, UseCaseError>> {
    try {
      const requestedQuantity = dto.quantity ?? 1;

      const inventoryResult = await this.inventoryRepository.findByProductId(
        dto.productId,
      );
      if (inventoryResult.isFailure) return inventoryResult;

      const inventory = inventoryResult.value;

      const checkStockResult = inventory.isInStock(requestedQuantity);
      if (checkStockResult.isFailure) return checkStockResult;

      return Result.success({
        isAvailable: checkStockResult.value,
        availableQuantity: inventory.availableQuantity,
        requestedQuantity,
      });
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
