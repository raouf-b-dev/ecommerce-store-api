import { ListInventoryQuery } from '../queries/list-inventory.query';
import { InventoryListItemDTO } from '../queries/results/inventory-list-item.result';
import { PaginatedQueryResult } from '../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';

export abstract class InventoryQueryService {
  abstract list(
    query: ListInventoryQuery,
  ): Promise<Result<PaginatedQueryResult<InventoryListItemDTO>, QueryError>>;

  abstract getByProductId(
    productId: number,
  ): Promise<Result<InventoryListItemDTO | null, QueryError>>;
}
