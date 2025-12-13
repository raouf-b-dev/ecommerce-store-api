import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { CancelOrderUseCase } from '../../application/usecases/cancel-order/cancel-order.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';

@Injectable()
export class CancelOrderStep extends BaseJobHandler<
  ScheduleCheckoutProps & { orderId?: string },
  void
> {
  protected readonly logger = new Logger(CancelOrderStep.name);

  constructor(private readonly cancelOrderUseCase: CancelOrderUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps & { orderId?: string }>,
  ): Promise<Result<void, AppError>> {
    const { orderId } = job.data;

    if (!orderId) {
      this.logger.warn('No order ID found to cancel.');
      return Result.success(undefined);
    }

    this.logger.log(`Cancelling order ${orderId}...`);

    const result = await this.cancelOrderUseCase.execute(orderId);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Order ${orderId} cancelled.`);
    return Result.success(undefined);
  }
}
