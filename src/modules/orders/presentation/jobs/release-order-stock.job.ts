import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ReleaseOrderStockUseCase } from '../../application/usecases/release-order-stock/release-order-stock.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';

@Injectable()
export class ReleaseOrderStockJob extends BaseJobHandler<
  { orderId: number },
  void
> {
  protected readonly logger = new Logger(ReleaseOrderStockJob.name);

  constructor(
    private readonly releaseOrderStockUseCase: ReleaseOrderStockUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<{ orderId: number }>,
  ): Promise<Result<void, AppError>> {
    const { orderId } = job.data;

    if (!orderId) {
      this.logger.warn('No order ID found to release stock for.');
      return Result.success(undefined);
    }

    this.logger.log(`Releasing stock for order ${orderId}...`);

    const result = await this.releaseOrderStockUseCase.execute(orderId);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Stock released for order ${orderId}.`);
    return Result.success(undefined);
  }
}
