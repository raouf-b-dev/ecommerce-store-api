import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import {
  HandlePaymentCompletedUseCase,
  HandlePaymentCompletedDto,
  HandlePaymentCompletedResult,
} from '../../application/usecases/handle-payment-completed/handle-payment-completed.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';

@Injectable()
export class PaymentCompletedStep extends BaseJobHandler<
  HandlePaymentCompletedDto,
  HandlePaymentCompletedResult
> {
  protected readonly logger = new Logger(PaymentCompletedStep.name);

  constructor(
    private readonly handlePaymentCompletedUseCase: HandlePaymentCompletedUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<HandlePaymentCompletedDto>,
  ): Promise<Result<HandlePaymentCompletedResult, AppError>> {
    this.logger.log(
      `Processing payment completed for order ${job.data.orderId}`,
    );

    const result = await this.handlePaymentCompletedUseCase.execute(job.data);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    return Result.success(result.value);
  }
}
