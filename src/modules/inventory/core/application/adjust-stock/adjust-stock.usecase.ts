import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  AdjustStockDto,
  StockAdjustmentType,
} from '../../../primary-adapters/dto/adjust-stock.dto';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { Inventory } from '../../domain/entities/inventory';
import { IInventory } from '../../domain/interfaces/inventory.interface';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';

@Injectable()
export class AdjustStockUseCase
  implements
    UseCase<
      { productId: number; dto: AdjustStockDto },
      IInventory,
      UseCaseError
    >
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(input: {
    productId: number;
    dto: AdjustStockDto;
  }): Promise<Result<IInventory, UseCaseError>> {
    try {
      const inventoryResult = await this.inventoryRepository.findByProductId(
        input.productId,
      );
      if (inventoryResult.isFailure) return inventoryResult;

      const inventory: Inventory = inventoryResult.value;

      const adjustmentResult = this.applyAdjustment(inventory, input.dto);
      if (adjustmentResult.isFailure) return adjustmentResult;

      const updateResult = await this.inventoryRepository.update(inventory);
      if (updateResult.isFailure) return updateResult;

      return Result.success(inventory.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }

  private applyAdjustment(
    inventory: Inventory,
    dto: AdjustStockDto,
  ): Result<void, DomainError> {
    switch (dto.type) {
      case StockAdjustmentType.ADD:
        return inventory.increaseStock(dto.quantity);
      case StockAdjustmentType.SUBTRACT:
        return inventory.decreaseStock(dto.quantity);
      case StockAdjustmentType.SET:
        return inventory.setStock(dto.quantity);
      default:
        return ErrorFactory.DomainError(`Invalid stock adjustment type`);
    }
  }
}
