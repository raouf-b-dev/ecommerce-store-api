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

export interface HandlePaymentCompletedDto {
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
  HandlePaymentCompletedDto,
  HandlePaymentCompletedResult,
  UseCaseError
> {
  private readonly logger = new Logger(HandlePaymentCompletedUseCase.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderScheduler: OrderScheduler,
  ) {
    super();
  }

  async execute(
    dto: HandlePaymentCompletedDto,
  ): Promise<Result<HandlePaymentCompletedResult, UseCaseError>> {
    try {
      const { orderId, paymentId, reservationId, cartId } = dto;
      this.logger.log(`Handling payment completion for order ${orderId}`);

      // 1. Find order
      const orderResult = await this.orderRepository.findById(orderId);
      if (isFailure(orderResult)) {
        return ErrorFactory.UseCaseError(
          `Order not found: ${orderId}`,
          orderResult.error,
        );
      }

      const order = orderResult.value;

      // 2. Idempotency check - skip if already confirmed
      if (order.status === OrderStatus.CONFIRMED) {
        this.logger.log(`Order ${orderId} already confirmed, skipping...`);
        return Result.success({
          orderId,
          status: order.status,
        });
      }

      // 3. Confirm payment (atomic operation for this job)
      const confirmResult = order.confirmPayment(paymentId);
      if (isFailure(confirmResult)) {
        return ErrorFactory.UseCaseError(
          `Failed to confirm payment for order ${orderId}`,
          confirmResult.error,
        );
      }

      await this.orderRepository.updateStatus(orderId, order.status);
      this.logger.log(`Order ${orderId} confirmed after payment`);

      // 4. Schedule post-payment flow as a SEPARATE job (atomic, retriable independently)
      if (reservationId && cartId) {
        const scheduleResult = await this.orderScheduler.schedulePostPayment(
          orderId,
          reservationId,
          cartId,
        );

        if (isFailure(scheduleResult)) {
          // Log but don't fail - order is confirmed, post-payment is a separate concern
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
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error handling payment completed',
        error,
      );
    }
  }
}
