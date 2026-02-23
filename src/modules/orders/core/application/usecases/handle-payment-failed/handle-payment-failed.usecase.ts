import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderStatus } from '../../../domain/value-objects/order-status';

export interface HandlePaymentFailedDto {
  orderId: number;
  paymentId: number;
  reason?: string;
  reservationId?: number;
}

export interface HandlePaymentFailedResult {
  orderId: number;
  status: OrderStatus;
}

@Injectable()
export class HandlePaymentFailedUseCase extends UseCase<
  HandlePaymentFailedDto,
  HandlePaymentFailedResult,
  UseCaseError
> {
  private readonly logger = new Logger(HandlePaymentFailedUseCase.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderScheduler: OrderScheduler,
  ) {
    super();
  }

  async execute(
    dto: HandlePaymentFailedDto,
  ): Promise<Result<HandlePaymentFailedResult, UseCaseError>> {
    try {
      const { orderId, reason, reservationId } = dto;
      this.logger.log(`Handling payment failure for order ${orderId}`);

      // 1. Find order
      const orderResult = await this.orderRepository.findById(orderId);
      if (isFailure(orderResult)) {
        return ErrorFactory.UseCaseError(
          `Order not found: ${orderId}`,
          orderResult.error,
        );
      }

      const order = orderResult.value;

      // 2. Idempotency check - skip if already marked as failed
      if (order.status === OrderStatus.PAYMENT_FAILED) {
        this.logger.log(
          `Order ${orderId} already marked as failed, skipping...`,
        );
        return Result.success({
          orderId,
          status: order.status,
        });
      }

      // 3. Mark payment as failed (atomic operation for this job)
      const failResult = order.markPaymentFailed();
      if (isFailure(failResult)) {
        return ErrorFactory.UseCaseError(
          `Failed to mark payment failed for order ${orderId}`,
          failResult.error,
        );
      }

      await this.orderRepository.updateStatus(orderId, order.status);
      this.logger.log(
        `Order ${orderId} marked as payment failed. Reason: ${reason}`,
      );

      // 4. Schedule stock release as a SEPARATE job (atomic, retriable independently)
      if (reservationId) {
        const releaseResult =
          await this.orderScheduler.scheduleStockRelease(reservationId);

        if (isFailure(releaseResult)) {
          // Log but don't fail - order status is updated, stock release is a separate concern
          this.logger.error(
            `Failed to schedule stock release for order ${orderId}. ` +
              `Manual intervention may be required.`,
            releaseResult.error,
          );
        } else {
          this.logger.log(
            `Stock release scheduled for order ${orderId}, reservation ${reservationId}`,
          );
        }
      } else {
        this.logger.warn(
          `No reservationId provided for order ${orderId}. Stock release not scheduled.`,
        );
      }

      return Result.success({
        orderId,
        status: order.status,
      });
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error handling payment failed',
        error,
      );
    }
  }
}
