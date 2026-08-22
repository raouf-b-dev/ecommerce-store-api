import { OrderQueryService } from '../../core/application/ports/order-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { OrderListItemDTO } from '../../core/application/queries/results/order-list-item.result';
import { OrderDetailDTO } from '../../core/application/queries/results/order-detail.result';

export class MockOrderQueryService implements OrderQueryService {
  list = jest.fn<
    Promise<Result<PaginatedQueryResult<OrderListItemDTO>, QueryError>>,
    [Parameters<OrderQueryService['list']>[0]]
  >();

  getById = jest.fn<
    Promise<Result<OrderDetailDTO | null, QueryError>>,
    [number, number | undefined]
  >();

  mockSuccessfulList(items: OrderListItemDTO[], total = items.length) {
    this.list.mockResolvedValue(
      Result.success({
        items,
        total,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10) || 1,
      }),
    );
  }

  mockSuccessfulGetById(detail: OrderDetailDTO | null) {
    this.getById.mockResolvedValue(Result.success(detail));
  }

  reset() {
    this.list.mockReset();
    this.getById.mockReset();
  }
}
