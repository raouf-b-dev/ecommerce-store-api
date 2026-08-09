import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

export interface ConfirmOrderCommand {
  orderId: number;
}

@Injectable()
export class ConfirmOrderUseCase implements UseCase<
  ConfirmOrderCommand,
  IOrder,
  UseCaseError
> {
  private readonly logger = new Logger(ConfirmOrderUseCase.name);

  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    dto: ConfirmOrderCommand,
  ): Promise<Result<IOrder, UseCaseError>> {
    const { orderId } = dto;
    const requestedOrder =
      await this.orderRepository.findByIdForUpdate(orderId);
    if (requestedOrder.isFailure) return requestedOrder;

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

    return Result.success(order.toPrimitives());
  }
}
