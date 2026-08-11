import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { InventoryQueryService } from '../../ports/inventory-query.service';
import { InventoryListItemDTO } from '../../queries/results/inventory-list-item.result';

@Injectable()
export class GetInventoryUseCase implements UseCase<
  number,
  InventoryListItemDTO,
  UseCaseError
> {
  constructor(private readonly inventoryQueryService: InventoryQueryService) {}

  async execute(
    productId: number,
  ): Promise<Result<InventoryListItemDTO, UseCaseError>> {
    const queryResult =
      await this.inventoryQueryService.getByProductId(productId);
    if (queryResult.isFailure) {
      return ErrorFactory.UseCaseError(
        queryResult.error.message,
        queryResult.error,
      );
    }

    if (!queryResult.value) {
      return ErrorFactory.UseCaseError(
        `Inventory for product ID ${productId} not found`,
      );
    }

    return Result.success(queryResult.value);
  }
}
