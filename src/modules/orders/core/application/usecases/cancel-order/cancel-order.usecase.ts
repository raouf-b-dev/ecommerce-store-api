import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Order } from '../../../domain/entities/order';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

export interface CancelOrderCommand {
  orderId: number;
  isSagaCompensation?: boolean;
}

@Injectable()
export class CancelOrderUseCase
  implements UseCase<CancelOrderCommand, IOrder, UseCaseError>
{
  constructor(
    private orderRepository: OrderRepository,
    private readonly orderScheduler: OrderScheduler,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    dto: CancelOrderCommand,
  ): Promise<Result<IOrder, UseCaseError>> {
    const { orderId, isSagaCompensation } = dto;
    const requestedOrder = await this.orderRepository.findById(orderId);
    if (requestedOrder.isFailure) return requestedOrder;

    const order: Order = requestedOrder.value;

    const cancelResult = order.cancel();
    if (cancelResult.isFailure) return cancelResult;

    const updateResult = await this.orderRepository.cancelOrder(order);
    if (updateResult.isFailure) return updateResult;

    const scheduleResult = await this.orderScheduler.scheduleOrderStockRelease(
      order.id!,
    );

    if (isFailure(scheduleResult)) {
      console.error(
        `Failed to schedule stock release for order ${order.id}: ${scheduleResult.error.message}`,
      );
    }

    if (isSagaCompensation) {
      this.domainEventPublisher.publish('checkout.saga.compensation', {
        step: 'cancel-order',
        orderId,
      });
      this.domainEventPublisher.publish('checkout.saga.failed', {
        orderId,
      });
    }

    return Result.success(order.toPrimitives());
  }
}
