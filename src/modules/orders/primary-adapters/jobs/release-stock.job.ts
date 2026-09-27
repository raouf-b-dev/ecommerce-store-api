import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { ReleaseCheckoutStockUseCase } from '../../core/application/usecases/release-checkout-stock/release-checkout-stock.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

@Injectable()
export class ReleaseStockStep extends BaseJobHandler<
  ScheduleCheckoutProps & { reservationId?: number },
  void
> {
  protected readonly logger = new Logger(ReleaseStockStep.name);

  constructor(
    private readonly releaseStockUseCase: ReleaseCheckoutStockUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps & { reservationId?: number }>,
  ): Promise<Result<void, AppError>> {
    const { reservationId } = job.data;

    if (!reservationId) {
      this.logger.warn('No reservation ID found to release.');
      return Result.success(undefined);
    }

    this.logger.log(`Releasing stock for reservation ${reservationId}...`);

    const result = await this.releaseStockUseCase.execute(reservationId);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Stock released for reservation ${reservationId}.`);
    return Result.success(undefined);
  }
}
