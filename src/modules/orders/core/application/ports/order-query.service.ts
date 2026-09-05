import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';
import { PaginatedQueryResult } from '../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { ListOrdersQuery } from '../queries/list-orders.query';
import { OrderListItemDTO } from '../queries/results/order-list-item.result';
import { OrderDetailDTO } from '../queries/results/order-detail.result';

/**
 * Query Port - read-only presentation projections for Orders.
 *
 * This port is an APPLICATION-LAYER contract (NOT a domain aggregate repository).
 * It returns presentation DTOs (OrderListItemDTO, OrderDetailDTO)
 * optimized for UI consumption, bypassing domain aggregate hydration.
 */
export abstract class OrderQueryService {
  abstract list(
    query: ListOrdersQuery,
  ): Promise<Result<PaginatedQueryResult<OrderListItemDTO>, QueryError>>;

  abstract getById(
    id: number,
    authorizedUserId?: number,
  ): Promise<Result<OrderDetailDTO | null, QueryError>>;
}
