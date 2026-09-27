import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaginatedQueryResult } from '../../../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { CallerContext } from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  USER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserQueryService } from '../../../ports/user-query.service';
import { ListUsersQuery } from '../../../queries/list-users.query';
import { UserListItemDTO } from '../../../queries/results/user-list-item.result';

export interface ListUsersInput extends ListUsersQuery {
  callerContext?: CallerContext | null;
}

@Injectable()
export class ListUsersUseCase implements UseCase<
  ListUsersInput | undefined,
  PaginatedQueryResult<UserListItemDTO>,
  UseCaseError
> {
  constructor(private readonly userQueryService: UserQueryService) {}

  async execute(
    input: ListUsersInput = {},
  ): Promise<Result<PaginatedQueryResult<UserListItemDTO>, UseCaseError>> {
    const { callerContext, ...query } = input;

    if (callerContext) {
      const scope = OwnedResourceAccessPolicy.resolveListScope(
        callerContext,
        USER_ACCESS_PERMISSIONS,
      );

      if (!scope.allowed) {
        return Result.success({
          items: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 10,
          totalPages: 0,
        });
      }

      query.authorizedUserId = scope.userId;
    }

    const result = await this.userQueryService.list(query);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
