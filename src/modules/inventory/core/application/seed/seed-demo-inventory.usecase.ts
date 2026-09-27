import { Injectable, HttpStatus } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Inventory } from '../../domain/entities/inventory';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';

export interface SeedDemoInventoryItem {
  productId: number;
  sku: string;
  initialStock: number;
  lowStockThreshold: number;
}

export interface SeededDemoInventoryItem {
  productId: number;
  sku: string;
  status: 'created' | 'existing';
}

@Injectable()
export class SeedDemoInventoryUseCase extends UseCase<
  SeedDemoInventoryItem[],
  SeededDemoInventoryItem[],
  UseCaseError
> {
  constructor(private readonly inventoryRepository: InventoryRepository) {
    super();
  }

  async execute(
    items: SeedDemoInventoryItem[],
  ): Promise<Result<SeededDemoInventoryItem[], UseCaseError>> {
    const existenceChecks = await Promise.all(
      items.map((item) =>
        this.inventoryRepository.findByProductId(item.productId),
      ),
    );

    for (let i = 0; i < existenceChecks.length; i++) {
      const check = existenceChecks[i];
      const item = items[i];
      if (check.isFailure && check.error.statusCode !== HttpStatus.NOT_FOUND) {
        return ErrorFactory.UseCaseError(
          `Failed to check existing inventory for ${item.sku}`,
          check.error,
        );
      }
    }

    const missingItems = items.filter(
      (_, i) =>
        existenceChecks[i].isFailure &&
        existenceChecks[i].error.statusCode === HttpStatus.NOT_FOUND,
    );

    const saveResults = await Promise.all(
      missingItems.map((item) => {
        const inventory = Inventory.createForProduct(
          item.productId,
          item.initialStock,
          item.lowStockThreshold,
        );
        return this.inventoryRepository.save(inventory);
      }),
    );

    for (let i = 0; i < saveResults.length; i++) {
      const saveResult = saveResults[i];
      if (saveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to seed inventory for ${missingItems[i].sku}`,
          saveResult.error,
        );
      }
    }

    const seededItems: SeededDemoInventoryItem[] = items.map((item, i) => ({
      productId: item.productId,
      sku: item.sku,
      status: existenceChecks[i].isSuccess
        ? ('existing' as const)
        : ('created' as const),
    }));

    return Result.success(seededItems);
  }
}
