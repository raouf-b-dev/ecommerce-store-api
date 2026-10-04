import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Order } from '../../../domain/entities/order';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { CancelOrderCommand } from '../../commands/cancel-order.command';

function invalidRefundAmount(): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError('Refund amount must be greater than zero');
}

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

    const reason = isSagaCompensation
      ? 'Checkout compensation'
      : 'Order cancelled';

    if (order.status === OrderStatus.CANCELLED) {
      const refundResult = await this.scheduleRefundIfPaid(
        order,
        orderId,
        reason,
      );
      if (refundResult.isFailure) return refundResult;
      return Result.success(order.toPrimitives());
    }

    const cancelResult = order.cancel();
    if (cancelResult.isFailure) return cancelResult;

    if (order.paymentId !== null && order.totalPrice <= 0) {
      return invalidRefundAmount();
    }

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    const refundResult = await this.scheduleRefundIfPaid(
      order,
      orderId,
      reason,
    );
    if (refundResult.isFailure) return refundResult;

    const scheduleResult =
      await this.orderScheduler.scheduleOrderStockRelease(orderId);

    if (scheduleResult.isFailure) {
      this.logger.error(
        `Failed to schedule stock release for order ${orderId}: ${scheduleResult.error.message}`,
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

  private async scheduleRefundIfPaid(
    order: Order,
    orderId: number,
    reason: string,
  ): Promise<Result<void, UseCaseError>> {
    if (order.paymentId === null) {
      return Result.success(undefined);
    }

    if (order.totalPrice <= 0) {
      return invalidRefundAmount();
    }

    const refundResult = await this.orderScheduler.scheduleRefundPayment({
      orderId,
      paymentId: order.paymentId,
      amount: order.totalPrice,
      reason,
    });

    if (refundResult.isFailure) {
      this.logger.error(
        `Failed to schedule refund for order ${orderId}: ${refundResult.error.message}`,
      );
      return ErrorFactory.UseCaseError(
        'Order cancelled but the refund could not be scheduled',
        refundResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return Result.success(undefined);
  }
}
