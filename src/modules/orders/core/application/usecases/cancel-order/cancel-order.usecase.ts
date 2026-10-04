import { HttpStatus, Injectable, Logger } from '@nestjs/common';
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

    const reason = isSagaCompensation
      ? 'Checkout compensation'
      : 'Order cancelled';

    if (order.status === OrderStatus.CANCELLED) {
      if (order.paymentId !== null) {
        if (order.totalPrice <= 0) {
          return ErrorFactory.UseCaseError(
            'Refund amount must be greater than zero',
          );
        }

        const refundResult = await this.orderScheduler.scheduleRefundPayment({
          orderId,
          paymentId: order.paymentId,
          amount: order.totalPrice,
          reason,
        });

        if (isFailure(refundResult)) {
          this.logger.error(
            `Failed to schedule refund for cancelled order ${orderId}: ${refundResult.error.message}`,
          );
          return ErrorFactory.UseCaseError(
            'Order cancelled but the refund could not be scheduled',
            refundResult.error,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
      return Result.success(order.toPrimitives());
    }

    const cancelResult = order.cancel();
    if (cancelResult.isFailure) return cancelResult;

    if (order.paymentId !== null && order.totalPrice <= 0) {
      return ErrorFactory.UseCaseError(
        'Refund amount must be greater than zero',
      );
    }

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    if (order.paymentId !== null) {
      const refundResult = await this.orderScheduler.scheduleRefundPayment({
        orderId,
        paymentId: order.paymentId,
        amount: order.totalPrice,
        reason,
      });

      if (isFailure(refundResult)) {
        this.logger.error(
          `Failed to schedule refund for order ${orderId}: ${refundResult.error.message}`,
        );
        return ErrorFactory.UseCaseError(
          'Order cancelled but the refund could not be scheduled',
          refundResult.error,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    const scheduleResult =
      await this.orderScheduler.scheduleOrderStockRelease(orderId);

    if (isFailure(scheduleResult)) {
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
}
