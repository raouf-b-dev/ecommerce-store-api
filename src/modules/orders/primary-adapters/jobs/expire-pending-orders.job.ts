import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { Result } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { ExpirePendingOrdersUseCase } from '../../core/application/usecases/expire-pending-orders/expire-pending-orders.usecase';

@Injectable()
export class ExpirePendingOrdersJob extends BaseJobHandler<
  void,
  { cancelledCount: number }
> {
  protected readonly logger = new Logger(ExpirePendingOrdersJob.name);
  private readonly EXPIRATION_MINUTES = 30;

  constructor(
    private readonly expirePendingOrdersUseCase: ExpirePendingOrdersUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<void>,
  ): Promise<Result<{ cancelledCount: number }, AppError>> {
    this.logger.log('Executing pending orders expiration check...');

    const result = await this.expirePendingOrdersUseCase.execute({
      expirationMinutes: this.EXPIRATION_MINUTES,
    });

    if (result.isFailure) {
      return Result.failure(result.error);
    }

    this.logger.log(
      `Pending orders expiration check completed. Cancelled ${result.value.cancelledCount} orders.`,
    );

    return Result.success({ cancelledCount: result.value.cancelledCount });
  }
}
