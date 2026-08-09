import { Injectable } from '@nestjs/common';
import { OrderQueryService } from '../../ports/order-query.service';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { OrderDetailDTO } from '../../queries/results/order-detail.result';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface GetOrderInput {
  orderId: number;
  callerContext: CallerContext;
}

@Injectable()
export class GetOrderUseCase extends UseCase<
  GetOrderInput,
  OrderDetailDTO,
  UseCaseError
> {
  constructor(private readonly orderQueryService: OrderQueryService) {
    super();
  }

  async execute(
    input: GetOrderInput,
  ): Promise<Result<OrderDetailDTO, UseCaseError>> {
    const { orderId, callerContext } = input;

    const scope = OwnedResourceAccessPolicy.resolveResourceScope(
      callerContext,
      ORDER_ACCESS_PERMISSIONS,
    );

    if (!scope.allowed) {
      return ErrorFactory.UseCaseError(`Order with id ${orderId} not found`);
    }

    const orderResult = await this.orderQueryService.getById(
      orderId,
      scope.authorizedUserId,
    );

    if (isFailure(orderResult) || !orderResult.value) {
      return ErrorFactory.UseCaseError(`Order with id ${orderId} not found`);
    }

    return Result.success(orderResult.value);
  }
}
