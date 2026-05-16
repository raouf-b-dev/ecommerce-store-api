import { Injectable } from '@nestjs/common';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { CheckStockResult } from '../../domain/interfaces/check-stock-result.interface';

@Injectable()
export class CheckStockUseCase
  implements
    UseCase<
      { productId: number; quantity?: number },
      CheckStockResult,
      UseCaseError
    >
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(input: {
    productId: number;
    quantity?: number;
  }): Promise<Result<CheckStockResult, UseCaseError>> {
    const requestedQuantity = input.quantity ?? 1;

    const inventoryResult = await this.inventoryRepository.findByProductId(
      input.productId,
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
  }
}
