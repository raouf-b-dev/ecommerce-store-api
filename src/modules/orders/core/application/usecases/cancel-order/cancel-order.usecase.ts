import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { CancelOrderCommand } from '../../commands/cancel-order.command';

@Injectable()
export class CancelOrderUseCase implements UseCase<
  CancelOrderCommand,
  IOrder,
  UseCaseError
> {
  private readonly logger = new Logger(CancelOrderUseCase.name);

  constructor(
    private orderRepository: OrderRepository,
    private readonly orderScheduler: OrderScheduler,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    dto: CancelOrderCommand,
  ): Promise<Result<IOrder, UseCaseError>> {
    const { orderId, isSagaCompensation } = dto;
    const requestedOrder =
      await this.orderRepository.findByIdForUpdate(orderId);
    if (requestedOrder.isFailure) return requestedOrder;

    const { entity: order, expectedVersion } = requestedOrder.value;

    if (order.status === OrderStatus.CANCELLED) {
      return Result.success(order.toPrimitives());
    }

    const cancelResult = order.cancel();
    if (cancelResult.isFailure) return cancelResult;

    if (order.paymentId !== null) {
      if (order.totalPrice <= 0) {
        return ErrorFactory.UseCaseError(
          'Refund amount must be greater than zero',
        );
      }

      const refundResult = await this.orderScheduler.scheduleRefundPayment(
        order.paymentId,
        order.totalPrice,
        order.id ?? undefined,
      );

      if (isFailure(refundResult)) {
        this.logger.error(
          `Failed to schedule refund for order ${order.id}: ${refundResult.error.message}`,
        );
        return ErrorFactory.UseCaseError(
          'Failed to schedule refund for order',
          refundResult.error,
        );
      }
    }

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    if (order.id !== null) {
      const scheduleResult =
        await this.orderScheduler.scheduleOrderStockRelease(order.id);

      if (isFailure(scheduleResult)) {
        this.logger.error(
          `Failed to schedule stock release for order ${order.id}: ${scheduleResult.error.message}`,
        );
      }
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
