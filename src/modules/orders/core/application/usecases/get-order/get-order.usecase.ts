import { Injectable } from '@nestjs/common';
import { OrderQueryService } from '../../ports/order-query.service';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderDetailDTO } from '../../queries/results/order-detail.result';
import { CustomerPiiPolicy } from '../../../../../../shared-kernel/domain/policies/customer-pii.policy';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { orderNotFoundError } from '../../services/order-not-found';

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
      return orderNotFoundError(orderId);
    }

    const orderResult = await this.orderQueryService.getById(
      orderId,
      scope.authorizedUserId,
    );

    if (isFailure(orderResult) || !orderResult.value) {
      return orderNotFoundError(orderId);
    }

    return Result.success(
      CustomerPiiPolicy.present(orderResult.value, callerContext),
    );
  }
}
