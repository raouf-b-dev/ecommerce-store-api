import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaginatedQueryResult } from '../../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  PAYMENT_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { PaymentQueryService } from '../../ports/payment-query.service';
import { ListPaymentsQuery } from '../../queries/list-payments.query';
import { PaymentListItemDTO } from '../../queries/results/payment-list-item.result';

export interface ListPaymentsInput {
  query: ListPaymentsQuery;
  callerContext: CallerContext;
}

@Injectable()
export class ListPaymentsUseCase implements UseCase<
  ListPaymentsInput,
  PaginatedQueryResult<PaymentListItemDTO>,
  UseCaseError
> {
  constructor(private readonly paymentQueryService: PaymentQueryService) {}

  async execute(
    input: ListPaymentsInput,
  ): Promise<Result<PaginatedQueryResult<PaymentListItemDTO>, UseCaseError>> {
    const { query, callerContext } = input;
    const targetUserId = query.requestedUserId ?? query.userId;

    const scope = OwnedResourceAccessPolicy.resolveListScope(
      callerContext,
      PAYMENT_ACCESS_PERMISSIONS,
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

    const filteredQuery: ListPaymentsQuery = {
      ...query,
      authorizedUserId: scope.userId,
    };

    const result = await this.paymentQueryService.list(filteredQuery);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }

    return Result.success(result.value);
  }
}
