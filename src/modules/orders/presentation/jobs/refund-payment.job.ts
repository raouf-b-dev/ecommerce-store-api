import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ProcessRefundUseCase } from '../../../payments/application/usecases/process-refund/process-refund.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';

@Injectable()
export class RefundPaymentStep extends BaseJobHandler<
  ScheduleCheckoutProps & { paymentId?: string; orderTotal?: number },
  void
> {
  protected readonly logger = new Logger(RefundPaymentStep.name);

  constructor(private readonly processRefundUseCase: ProcessRefundUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<
      ScheduleCheckoutProps & { paymentId?: string; orderTotal?: number }
    >,
  ): Promise<Result<void, AppError>> {
    const { paymentId, orderTotal } = job.data;

    if (!paymentId) {
      this.logger.warn('No payment ID found to refund.');
      return Result.success(undefined);
    }

    this.logger.log(`Refunding payment ${paymentId}...`);

    const result = await this.processRefundUseCase.execute({
      id: paymentId,
      dto: {
        amount: orderTotal || 0,
        reason: 'Checkout compensation',
      },
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Payment ${paymentId} refunded.`);
    return Result.success(undefined);
  }
}
