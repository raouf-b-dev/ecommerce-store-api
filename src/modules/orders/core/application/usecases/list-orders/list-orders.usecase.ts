import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ListOrdersQuery } from '../../../domain/repositories/order-repository';
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
export class ListOrdersUsecase
  implements UseCase<ListOrdersInput, IOrder[], UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}

  async execute(
    input: ListOrdersInput,
  ): Promise<Result<IOrder[], UseCaseError>> {
    const { query, callerContext } = input;
    const scope = OwnedResourceAccessPolicy.resolveListScope(
      callerContext,
      ORDER_ACCESS_PERMISSIONS,
      query.customerId,
    );

    if (!scope.allowed) {
      return Result.success([]);
    }

    const filteredQuery = { ...query, customerId: scope.customerId };

    const ordersResult = await this.orderRepository.listOrders(filteredQuery);
    if (ordersResult.isFailure) {
      return ordersResult;
    }

    return Result.success(ordersResult.value);
  }
}
