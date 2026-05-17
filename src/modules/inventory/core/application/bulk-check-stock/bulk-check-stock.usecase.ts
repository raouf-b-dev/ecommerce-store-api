import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { CheckStockResult } from '../../domain/interfaces/check-stock-result.interface';
import { Inventory } from '../../domain/entities/inventory';

export interface BulkCheckStockQuery {
  productId: number;
  quantity?: number;
}

@Injectable()
export class BulkCheckStockUseCase
  implements UseCase<BulkCheckStockQuery[], CheckStockResult[], UseCaseError>
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(
    items: BulkCheckStockQuery[],
  ): Promise<Result<CheckStockResult[], UseCaseError>> {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));

    const inventoryResult =
      await this.inventoryRepository.findByProductIds(productIds);
    if (inventoryResult.isFailure) return inventoryResult;

    const inventories: Inventory[] = inventoryResult.value;

    const inventoryMap = new Map<number, Inventory>(
      inventories.map((inv) => [inv.productId, inv]),
    );

    const responses: CheckStockResult[] = [];

    for (const item of items) {
      const requestedQuantity = item.quantity ?? 1;
      const inventory = inventoryMap.get(item.productId);

      if (!inventory) {
        responses.push({
          isAvailable: false,
          availableQuantity: 0,
          requestedQuantity,
        });
        continue;
      }

      const checkStockResult = inventory.isInStock(item.quantity);
      if (checkStockResult.isFailure) return checkStockResult;

      responses.push({
        isAvailable: checkStockResult.value,
        availableQuantity: inventory.availableQuantity,
        requestedQuantity,
      });
    }

    return Result.success(responses);
  }
}
