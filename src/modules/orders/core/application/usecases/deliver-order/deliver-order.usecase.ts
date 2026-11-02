// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { orderNotFoundError } from '../../services/order-not-found';
import { OrderMutationMapper } from '../../mappers/order-mutation.mapper';
import { OrderMutationResult } from '../../queries/results/order-mutation.result';

export interface DeliverOrderCommand {
  notes?: string;
}

@Injectable()
export class DeliverOrderUseCase implements UseCase<
  { id: number; command?: DeliverOrderCommand },
  OrderMutationResult,
  UseCaseError
> {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(input: {
    id: number;
    command?: DeliverOrderCommand;
  }): Promise<Result<OrderMutationResult, UseCaseError>> {
    const requestedOrder = await this.orderRepository.findByIdForUpdate(
      input.id,
    );
    if (requestedOrder.isFailure) {
      if (requestedOrder.error.kind === ErrorKind.NOT_FOUND) {
        return orderNotFoundError(input.id);
      }
      return requestedOrder;
    }

    const { entity: order, expectedVersion } = requestedOrder.value;

    const deliverResult = order.deliver();
    if (deliverResult.isFailure) return deliverResult;

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) {
      return updateResult;
    }

    return Result.success(OrderMutationMapper.fromDomain(order));
  }
}
