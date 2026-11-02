import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { orderNotFoundError } from '../../services/order-not-found';
import { OrderMutationMapper } from '../../mappers/order-mutation.mapper';
import { OrderMutationResult } from '../../queries/results/order-mutation.result';

@Injectable()
export class ConfirmOrderUseCase implements UseCase<
  number,
  OrderMutationResult,
  UseCaseError
> {
  private readonly logger = new Logger(ConfirmOrderUseCase.name);

  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    orderId: number,
  ): Promise<Result<OrderMutationResult, UseCaseError>> {
    const requestedOrder =
      await this.orderRepository.findByIdForUpdate(orderId);
    if (requestedOrder.isFailure) {
      if (requestedOrder.error.kind === ErrorKind.NOT_FOUND) {
        return orderNotFoundError(orderId);
      }
      return requestedOrder;
    }

    const { entity: order, expectedVersion } = requestedOrder.value;

    if (!order.hasPayment()) {
      return ErrorFactory.DomainError(
        'Cannot confirm order - payment must be completed first',
      );
    }

    const confirmResult = order.confirmPayment(order.paymentId!);
    if (confirmResult.isFailure) return confirmResult;

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    return Result.success(OrderMutationMapper.fromDomain(order));
  }
}
