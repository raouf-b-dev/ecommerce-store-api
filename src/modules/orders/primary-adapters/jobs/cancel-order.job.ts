import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../shared-kernel/infrastructure/jobs/base-job.handler';
import { CancelOrderUseCase } from '../../core/application/usecases/cancel-order/cancel-order.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/errors/app.error';
import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';

@Injectable()
export class CancelOrderStep extends BaseJobHandler<
  ScheduleCheckoutProps & { orderId?: number },
  void
> {
  protected readonly logger = new Logger(CancelOrderStep.name);

  constructor(private readonly cancelOrderUseCase: CancelOrderUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps & { orderId?: number }>,
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
