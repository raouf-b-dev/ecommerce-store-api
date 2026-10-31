import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Order } from '../../domain/entities/order';
import {
  OrderScheduler,
  ScheduleRefundPaymentProps,
} from '../../domain/schedulers/order.scheduler';

function invalidRefundAmount(): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError('Refund amount must be greater than zero');
}

/**
 * Schedules payment refunds for cancel and surplus paths.
 * Shared by CancelOrderUseCase and HandlePaymentCompletedUseCase.
 */
@Injectable()
export class ScheduleOrderRefundService {
  private readonly logger = new Logger(ScheduleOrderRefundService.name);

  constructor(private readonly orderScheduler: OrderScheduler) {}

  /**
   * Cancel path: refund the order's recorded payment for the order total
   * when a paymentId is present.
   */
  async scheduleIfPaid(
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

    return this.scheduleRefund(
      {
        orderId,
        paymentId: order.paymentId,
        amount: order.getPricing().getTotalPriceMoney().toMajorUnits(),
        reason,
      },
      'Order cancelled but the refund could not be scheduled',
    );
  }

  /**
   * Surplus path: refund whatever remains of the given payment.
   * Does not read or change order.paymentId.
   */
  async scheduleForPayment(
    orderId: number,
    paymentId: number,
    reason: string,
  ): Promise<Result<void, UseCaseError>> {
    return this.scheduleRefund(
      {
        orderId,
        paymentId,
        mode: 'remaining',
        reason,
      },
      'Failed to schedule surplus payment refund',
    );
  }

  private async scheduleRefund(
    props: ScheduleRefundPaymentProps,
    failureMessage: string,
  ): Promise<Result<void, UseCaseError>> {
    const refundResult = await this.orderScheduler.scheduleRefundPayment(props);

    if (refundResult.isFailure) {
      this.logger.error(
        `Failed to schedule refund for order ${props.orderId}: ${refundResult.error.message}`,
      );
      return ErrorFactory.UseCaseError(
        failureMessage,
        refundResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
        refundResult.error.retryable,
      );
    }

    return Result.success(undefined);
  }
}
