import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ScheduleOrderRefundService } from '../../services/schedule-order-refund.service';
import { Order } from '../../../domain/entities/order';

export interface HandlePaymentCompletedCommand {
  orderId: number;
  paymentId: number;
  transactionId?: string;
  reservationId?: number;
  cartId?: number;
}

export interface HandlePaymentCompletedResult {
  orderId: number;
  status: OrderStatus;
}

@Injectable()
export class HandlePaymentCompletedUseCase extends UseCase<
  HandlePaymentCompletedCommand,
  HandlePaymentCompletedResult,
  UseCaseError
> {
  private readonly logger = new Logger(HandlePaymentCompletedUseCase.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderScheduler: OrderScheduler,
    private readonly scheduleOrderRefundService: ScheduleOrderRefundService,
  ) {
    super();
  }

  async execute(
    dto: HandlePaymentCompletedCommand,
  ): Promise<Result<HandlePaymentCompletedResult, UseCaseError>> {
    const { orderId, paymentId, reservationId, cartId } = dto;
    this.logger.log(`Handling payment completion for order ${orderId}`);

    const orderResult = await this.orderRepository.findByIdForUpdate(orderId);
    if (isFailure(orderResult)) {
      return ErrorFactory.UseCaseError(
        `Order not found: ${orderId}`,
        orderResult.error,
      );
    }

    const { entity: order, expectedVersion } = orderResult.value;

    if (order.status === OrderStatus.CONFIRMED) {
      this.logger.log(`Order ${orderId} already confirmed, skipping...`);
      return Result.success({
        orderId,
        status: order.status,
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return this.handleCancelledOrder(
        order,
        orderId,
        paymentId,
        expectedVersion,
      );
    }

    const confirmResult = order.confirmPayment(paymentId);
    if (isFailure(confirmResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to confirm payment for order ${orderId}`,
        confirmResult.error,
      );
    }

    const saveResult = await this.orderRepository.save(order, expectedVersion);
    if (isFailure(saveResult)) {
      return saveResult;
    }

    this.logger.log(`Order ${orderId} confirmed after payment`);

    if (reservationId && cartId) {
      const scheduleResult = await this.orderScheduler.schedulePostPayment(
        orderId,
        reservationId,
        cartId,
      );

      if (isFailure(scheduleResult)) {
        this.logger.error(
          `Failed to schedule post-payment flow for order ${orderId}. ` +
            `Manual intervention may be required.`,
          scheduleResult.error,
        );
      } else {
        this.logger.log(`Post-payment flow scheduled for order ${orderId}`);
      }
    } else {
      this.logger.warn(
        `Missing reservationId or cartId for order ${orderId}. ` +
          `Post-payment flow not scheduled.`,
      );
    }

    return Result.success({
      orderId,
      status: order.status,
    });
  }

  private async handleCancelledOrder(
    order: Order,
    orderId: number,
    paymentId: number,
    expectedVersion: number,
  ): Promise<Result<HandlePaymentCompletedResult, UseCaseError>> {
    const recordResult = order.recordPaymentAfterCancellation(paymentId);
    if (isFailure(recordResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to record payment after cancellation for order ${orderId}`,
        recordResult.error,
      );
    }

    const saveResult = await this.orderRepository.save(order, expectedVersion);
    if (isFailure(saveResult)) {
      return saveResult;
    }

    const refundResult = await this.scheduleOrderRefundService.scheduleIfPaid(
      order,
      orderId,
      'Payment completed after order cancellation',
    );
    if (isFailure(refundResult)) {
      return refundResult;
    }

    this.logger.log(
      `Refund scheduled for cancelled order ${orderId} after late payment`,
    );

    return Result.success({
      orderId,
      status: order.status,
    });
  }
}
