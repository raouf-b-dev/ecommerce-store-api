import { Injectable } from '@nestjs/common';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { CheckStockResponse } from '../../presentation/dto/check-stock-response.dto';
import { Inventory } from '../../domain/entities/inventory';

@Injectable()
export class BulkCheckStockUseCase
  implements
    UseCase<
      { productId: string; quantity?: number }[],
      CheckStockResponse[],
      UseCaseError
    >
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(
    dto: { productId: string; quantity?: number }[],
  ): Promise<Result<CheckStockResponse[], UseCaseError>> {
    try {
      const productIds = Array.from(new Set(dto.map((item) => item.productId)));

      const inventoryResult =
        await this.inventoryRepository.findByProductIds(productIds);
      if (inventoryResult.isFailure) return inventoryResult;

      const inventories: Inventory[] = inventoryResult.value;

      const inventoryMap = new Map<string, Inventory>(
        inventories.map((inv) => [inv.productId, inv]),
      );

      const responses: CheckStockResponse[] = [];

      for (const item of dto) {
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
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
