import { ListPaymentsQuery } from '../queries/list-payments.query';
import { PaymentListItemDTO } from '../queries/results/payment-list-item.result';
import { PaymentDetailDTO } from '../queries/results/payment-detail.result';
import { PaginatedQueryResult } from '../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';

export abstract class PaymentQueryService {
  abstract list(
    query: ListPaymentsQuery,
  ): Promise<Result<PaginatedQueryResult<PaymentListItemDTO>, QueryError>>;

  abstract getById(
    id: number,
    authorizedUserId?: number,
  ): Promise<Result<PaymentDetailDTO | null, QueryError>>;

  abstract getByOrderId(
    orderId: number,
    authorizedUserId?: number,
  ): Promise<Result<PaymentDetailDTO | null, QueryError>>;
}
