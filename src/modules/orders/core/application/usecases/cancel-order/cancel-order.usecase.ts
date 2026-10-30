import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { StatusCode } from '../../../../../../shared-kernel/domain/exceptions/status-code';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { CancelOrderCommand } from '../../commands/cancel-order.command';
import { CancelOrderAccessPolicy } from '../../services/cancel-order-access.policy';
import { orderNotFoundError } from '../../services/order-not-found';
import { ScheduleOrderRefundService } from '../../services/schedule-order-refund.service';

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
    private readonly scheduleOrderRefundService: ScheduleOrderRefundService,
  ) {}

  async execute(
    dto: CancelOrderCommand,
  ): Promise<Result<IOrder, UseCaseError>> {
    const { orderId, isSagaCompensation, callerContext } = dto;
    const requestedOrder =
      await this.orderRepository.findByIdForUpdate(orderId);
    if (requestedOrder.isFailure) {
      if (requestedOrder.error.statusCode === StatusCode.NOT_FOUND) {
        return orderNotFoundError(orderId);
      }
      return requestedOrder;
    }

    const { entity: order, expectedVersion } = requestedOrder.value;

    const accessResult = CancelOrderAccessPolicy.authorize(
      callerContext,
      order,
      orderId,
    );
    if (accessResult.isFailure) return accessResult;

    const reason = isSagaCompensation
      ? 'Checkout compensation'
      : 'Order cancelled';

    if (order.status === OrderStatus.CANCELLED) {
      await this.scheduleStockRelease(orderId);
      const refundResult = await this.scheduleOrderRefundService.scheduleIfPaid(
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
      return ErrorFactory.UseCaseError(
        'Refund amount must be greater than zero',
      );
    }

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    await this.scheduleStockRelease(orderId);

    const refundResult = await this.scheduleOrderRefundService.scheduleIfPaid(
      order,
      orderId,
      reason,
    );
    if (refundResult.isFailure) return refundResult;

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

  private async scheduleStockRelease(orderId: number): Promise<void> {
    const scheduleResult =
      await this.orderScheduler.scheduleOrderStockRelease(orderId);

    if (scheduleResult.isFailure) {
      this.logger.error(
        `Failed to schedule stock release for order ${orderId}: ${scheduleResult.error.message}`,
      );
    }
  }
}
