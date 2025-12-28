import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import {
  HandlePaymentFailedUseCase,
  HandlePaymentFailedDto,
  HandlePaymentFailedResult,
} from '../../application/usecases/handle-payment-failed/handle-payment-failed.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';

@Injectable()
export class PaymentFailedStep extends BaseJobHandler<
  HandlePaymentFailedDto,
  HandlePaymentFailedResult
> {
  protected readonly logger = new Logger(PaymentFailedStep.name);

  constructor(
    private readonly handlePaymentFailedUseCase: HandlePaymentFailedUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<HandlePaymentFailedDto>,
  ): Promise<Result<HandlePaymentFailedResult, AppError>> {
    this.logger.log(`Processing payment failed for order ${job.data.orderId}`);

    const result = await this.handlePaymentFailedUseCase.execute(job.data);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    return Result.success(result.value);
  }
}
