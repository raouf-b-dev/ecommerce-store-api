import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { CancelOrderCommand } from '../../commands/cancel-order.command';
import { CancelOrderAccessPolicy } from '../../services/cancel-order-access.policy';
import { orderNotFoundError } from '../../services/order-not-found';
import { ScheduleOrderRefundService } from '../../services/schedule-order-refund.service';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';
import { OrderMutationMapper } from '../../mappers/order-mutation.mapper';
import { OrderMutationResult } from '../../queries/results/order-mutation.result';

@Injectable()
export class CancelOrderUseCase implements UseCase<
  CancelOrderCommand,
  OrderMutationResult,
  UseCaseError | DomainError
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
  ): Promise<Result<OrderMutationResult, UseCaseError | DomainError>> {
    const { orderId, isSagaCompensation, callerContext } = dto;
    const requestedOrder =
      await this.orderRepository.findByIdForUpdate(orderId);
    if (requestedOrder.isFailure) {
      if (requestedOrder.error.kind === ErrorKind.NOT_FOUND) {
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
      return Result.success(OrderMutationMapper.fromDomain(order));
    }

    let refundAmount: Money | undefined;
    if (order.paymentId !== null) {
      const refundable = order.refundableTotal();
      if (refundable.isFailure) return refundable;
      refundAmount = refundable.value;
    }

    const cancelResult = order.cancel();
    if (cancelResult.isFailure) return cancelResult;

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
      refundAmount,
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

    return Result.success(OrderMutationMapper.fromDomain(order));
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
