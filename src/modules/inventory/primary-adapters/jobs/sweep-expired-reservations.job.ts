import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { Result } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { SweepExpiredReservationsUseCase } from '../../core/application/usecases/sweep-expired-reservations/sweep-expired-reservations.usecase';

@Injectable()
export class SweepExpiredReservationsJob extends BaseJobHandler<
  void,
  { sweptCount: number; failedCount: number }
> {
  protected readonly logger = new Logger(SweepExpiredReservationsJob.name);

  constructor(
    private readonly sweepExpiredReservationsUseCase: SweepExpiredReservationsUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<void>,
  ): Promise<Result<{ sweptCount: number; failedCount: number }, AppError>> {
    this.logger.log(
      `Executing expired reservations sweeper for job ${job.id ?? 'unknown'}...`,
    );

    const result = await this.sweepExpiredReservationsUseCase.execute();

    if (result.isFailure) {
      return Result.failure(result.error);
    }

    if (result.value.failedCount > 0) {
      this.logger.error(
        `Expired reservations sweeper encountered ${result.value.failedCount} failures during run.`,
      );
    }

    this.logger.log(
      `Expired reservations sweeper completed. Swept ${result.value.sweptCount} reservations, failed ${result.value.failedCount}.`,
    );

    return Result.success({
      sweptCount: result.value.sweptCount,
      failedCount: result.value.failedCount,
    });
  }
}
