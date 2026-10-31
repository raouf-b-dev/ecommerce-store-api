import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Order } from '../../domain/entities/order';
import { OrderScheduler } from '../../domain/schedulers/order.scheduler';

function invalidRefundAmount(): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError('Refund amount must be greater than zero');
}

/**
 * Schedules a payment refund when the order has a paymentId and a positive total.
 * Shared by CancelOrderUseCase and HandlePaymentCompletedUseCase.
 */
@Injectable()
export class ScheduleOrderRefundService {
  private readonly logger = new Logger(ScheduleOrderRefundService.name);

  constructor(private readonly orderScheduler: OrderScheduler) {}

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

    const refundResult = await this.orderScheduler.scheduleRefundPayment({
      orderId,
      paymentId: order.paymentId,
      amount: order.getPricing().getTotalPriceMoney().toMajorUnits(),
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
        refundResult.error.retryable,
      );
    }

    return Result.success(undefined);
  }
}
