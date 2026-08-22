import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { OrderQueryService } from '../../ports/order-query.service';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ListOrdersQuery } from '../../queries/list-orders.query';
import { OrderListItemDTO } from '../../queries/results/order-list-item.result';
import { PaginatedQueryResult } from '../../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface ListOrdersInput {
  query: ListOrdersQuery;
  callerContext: CallerContext;
}

@Injectable()
export class ListOrdersUsecase implements UseCase<
  ListOrdersInput,
  PaginatedQueryResult<OrderListItemDTO>,
  UseCaseError
> {
  constructor(private readonly orderQueryService: OrderQueryService) {}

  async execute(
    input: ListOrdersInput,
  ): Promise<Result<PaginatedQueryResult<OrderListItemDTO>, UseCaseError>> {
    const { query, callerContext } = input;
    const targetUserId = query.requestedUserId ?? query.userId;
    const scope = OwnedResourceAccessPolicy.resolveListScope(
      callerContext,
      ORDER_ACCESS_PERMISSIONS,
      targetUserId,
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

    const filteredQuery: ListOrdersQuery = {
      ...query,
      authorizedUserId: scope.userId,
    };

    const ordersResult = await this.orderQueryService.list(filteredQuery);
    if (ordersResult.isFailure) {
      return ErrorFactory.UseCaseError(
        ordersResult.error.message,
        ordersResult.error,
      );
    }

    return Result.success(ordersResult.value);
  }
}
