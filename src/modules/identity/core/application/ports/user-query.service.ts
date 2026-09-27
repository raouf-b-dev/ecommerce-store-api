import { ListUsersQuery } from '../queries/list-users.query';
import { UserListItemDTO } from '../queries/results/user-list-item.result';
import { UserDetailDTO } from '../queries/results/user-detail.result';
import { PaginatedQueryResult } from '../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';

export abstract class UserQueryService {
  abstract list(
    query: ListUsersQuery,
  ): Promise<Result<PaginatedQueryResult<UserListItemDTO>, QueryError>>;

  abstract getById(
    id: number,
    authorizedUserId?: number,
  ): Promise<Result<UserDetailDTO | null, QueryError>>;
}
