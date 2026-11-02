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
export class ProcessOrderUseCase implements UseCase<
  number,
  OrderMutationResult,
  UseCaseError
> {
  constructor(private orderRepository: OrderRepository) {}
  async execute(
    id: number,
  ): Promise<Result<OrderMutationResult, UseCaseError>> {
    const orderResult = await this.orderRepository.findByIdForUpdate(id);
    if (orderResult.isFailure) {
      if (orderResult.error.kind === ErrorKind.NOT_FOUND) {
        return orderNotFoundError(id);
      }
      return orderResult;
    }

    const { entity: order, expectedVersion } = orderResult.value;

    const processResult = order.process();
    if (processResult.isFailure) return processResult;

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    return Result.success(OrderMutationMapper.fromDomain(order));
  }
}
