import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaginatedQueryResult } from '../../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { InventoryQueryService } from '../../ports/inventory-query.service';
import { ListInventoryQuery } from '../../queries/list-inventory.query';
import { InventoryListItemDTO } from '../../queries/results/inventory-list-item.result';

@Injectable()
export class ListInventoryUseCase implements UseCase<
  ListInventoryQuery,
  PaginatedQueryResult<InventoryListItemDTO>,
  UseCaseError
> {
  constructor(private readonly inventoryQueryService: InventoryQueryService) {}

  async execute(
    query: ListInventoryQuery,
  ): Promise<Result<PaginatedQueryResult<InventoryListItemDTO>, UseCaseError>> {
    const result = await this.inventoryQueryService.list(query);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
