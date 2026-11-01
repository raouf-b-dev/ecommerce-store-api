import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
import { Injectable, Logger } from '@nestjs/common';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { Order } from '../../domain/entities/order';
import {
  OrderScheduler,
  ScheduleRefundPaymentProps,
} from '../../domain/schedulers/order.scheduler';

/**
 * Schedules payment refunds for cancel and surplus paths.
 * Shared by CancelOrderUseCase and HandlePaymentCompletedUseCase.
 */
@Injectable()
export class ScheduleOrderRefundService {
  private readonly logger = new Logger(ScheduleOrderRefundService.name);

  constructor(private readonly orderScheduler: OrderScheduler) {}

  /**
   * Domain refundable-total check, wrapped once as a UseCaseError so
   * cancel keeps HTTP 422 with code USECASE_ERROR.
   */
  ensureRefundable(order: Order): Result<Money, UseCaseError> {
    const result = order.refundableTotal();
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(
        'Refund amount must be greater than zero',
        { cause: result.error },
      );
    }
    return Result.success(result.value);
  }

  /**
   * Cancel path: refund the order's recorded payment for the order total
   * when a paymentId is present.
   * Pass `amount` when the caller already ran ensureRefundable (first
   * cancel) so the check is not repeated. Omit it on idempotent retries
   * so this method still validates.
   */
  async scheduleIfPaid(
    order: Order,
    orderId: number,
    reason: string,
    amount?: Money,
  ): Promise<Result<void, UseCaseError>> {
    if (order.paymentId === null) {
      return Result.success(undefined);
    }

    const amountResult =
      amount !== undefined
        ? Result.success(amount)
        : this.ensureRefundable(order);
    if (amountResult.isFailure) {
      return amountResult;
    }

    return this.scheduleRefund(
      {
        orderId,
        paymentId: order.paymentId,
        amount: amountResult.value,
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
      return ErrorFactory.UseCaseError(failureMessage, {
        cause: refundResult.error,
        kind: ErrorKind.INTERNAL,
        retryable: refundResult.error.retryable,
      });
    }

    return Result.success(undefined);
  }
}
