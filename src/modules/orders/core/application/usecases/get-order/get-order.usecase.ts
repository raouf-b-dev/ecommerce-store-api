import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { IOrder } from '../../../domain/interfaces/order.interface';
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
  IOrder,
  UseCaseError
> {
  constructor(private readonly orderRepository: OrderRepository) {
    super();
  }

  async execute(input: GetOrderInput): Promise<Result<IOrder, UseCaseError>> {
    const { orderId, callerContext } = input;
    const orderResult = await this.orderRepository.findById(orderId);

    if (isFailure(orderResult)) {
      return ErrorFactory.UseCaseError(`Order with id ${orderId} not found`);
    }

    const order = orderResult.value;
    if (!order) {
      return ErrorFactory.UseCaseError(`Order with id ${orderId} not found`);
    }

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        order.userId,
        ORDER_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(`Order with id ${orderId} not found`);
    }

    return Result.success(order.toPrimitives());
  }
}
