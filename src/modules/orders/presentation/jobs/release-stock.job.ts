import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ReleaseStockUseCase } from '../../../inventory/application/release-stock/release-stock.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';

@Injectable()
export class ReleaseStockStep extends BaseJobHandler<
  ScheduleCheckoutProps & { reservationId?: string },
  void
> {
  protected readonly logger = new Logger(ReleaseStockStep.name);

  constructor(private readonly releaseStockUseCase: ReleaseStockUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps & { reservationId?: string }>,
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
