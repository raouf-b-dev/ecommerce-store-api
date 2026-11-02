import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { orderNotFoundError } from '../../services/order-not-found';
import { OrderMutationMapper } from '../../mappers/order-mutation.mapper';
import { OrderMutationResult } from '../../queries/results/order-mutation.result';

@Injectable()
export class ShipOrderUseCase implements UseCase<
  number,
  OrderMutationResult,
  UseCaseError
> {
  constructor(private orderRepository: OrderRepository) {}
  async execute(
    id: number,
  ): Promise<Result<OrderMutationResult, UseCaseError>> {
    const requestedOrder = await this.orderRepository.findByIdForUpdate(id);
    if (requestedOrder.isFailure) {
      if (requestedOrder.error.kind === ErrorKind.NOT_FOUND) {
        return orderNotFoundError(id);
      }
      return requestedOrder;
    }

    const { entity: order, expectedVersion } = requestedOrder.value;

    const shipResult = order.ship();
    if (shipResult.isFailure) return shipResult;

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    return Result.success(OrderMutationMapper.fromDomain(order));
  }
}
