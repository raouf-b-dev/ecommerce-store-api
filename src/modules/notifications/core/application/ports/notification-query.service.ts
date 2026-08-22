import { ListNotificationsQuery } from '../queries/list-notifications.query';
import { NotificationListItemDTO } from '../queries/results/notification-list-item.result';
import { PaginatedQueryResult } from '../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';

export abstract class NotificationQueryService {
  abstract list(
    query: ListNotificationsQuery,
  ): Promise<Result<PaginatedQueryResult<NotificationListItemDTO>, QueryError>>;

  abstract getById(
    id: string,
  ): Promise<Result<NotificationListItemDTO | null, QueryError>>;
}
