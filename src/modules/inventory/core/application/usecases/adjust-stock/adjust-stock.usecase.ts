import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { StockAdjustmentType } from '../../../domain/value-objects/stock-adjustment-type';
import { InventoryRepository } from '../../../domain/repositories/inventory.repository';
import { Inventory } from '../../../domain/entities/inventory';
import { IInventory } from '../../../domain/interfaces/inventory.interface';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { AdjustStockCommand } from '../../commands/adjust-stock.command';

@Injectable()
export class AdjustStockUseCase implements UseCase<
  AdjustStockCommand,
  IInventory,
  UseCaseError
> {
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(
    command: AdjustStockCommand,
  ): Promise<Result<IInventory, UseCaseError>> {
    const { productId, quantity, type } = command;
    const inventoryResult =
      await this.inventoryRepository.findByProductIdForUpdate(productId);
    if (inventoryResult.isFailure) return inventoryResult;

    const { entity: inventory, expectedVersion } = inventoryResult.value;

    const adjustmentResult = this.applyAdjustment(inventory, quantity, type);
    if (adjustmentResult.isFailure) return adjustmentResult;

    const updateResult = await this.inventoryRepository.save(
      inventory,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    return Result.success(inventory.toPrimitives());
  }

  private applyAdjustment(
    inventory: Inventory,
    quantity: number,
    type: StockAdjustmentType,
  ): Result<void, DomainError> {
    switch (type) {
      case StockAdjustmentType.ADD:
        return inventory.increaseStock(quantity);
      case StockAdjustmentType.SUBTRACT:
        return inventory.decreaseStock(quantity);
      case StockAdjustmentType.SET:
        return inventory.setStock(quantity);
      default:
        return ErrorFactory.DomainError(`Invalid stock adjustment type`);
    }
  }
}
