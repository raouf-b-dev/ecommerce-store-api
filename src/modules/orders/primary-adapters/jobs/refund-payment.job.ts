import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';

@Injectable()
export class RefundPaymentStep extends BaseJobHandler<
  ScheduleCheckoutProps & { paymentId?: number; orderTotal?: number },
  void
> {
  protected readonly logger = new Logger(RefundPaymentStep.name);

  constructor(
    private readonly refundPaymentUseCase: RefundCheckoutPaymentUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<
      ScheduleCheckoutProps & { paymentId?: number; orderTotal?: number }
    >,
  ): Promise<Result<void, AppError>> {
    const { paymentId, orderTotal } = job.data;

    if (!paymentId) {
      this.logger.warn('No payment ID found to refund.');
      return Result.success(undefined);
    }

    this.logger.log(`Refunding payment ${paymentId}...`);

    const result = await this.refundPaymentUseCase.execute({
      paymentId,
      amount: orderTotal || 0,
      reason: 'Checkout compensation',
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Payment ${paymentId} refunded.`);
    return Result.success(undefined);
  }
}
