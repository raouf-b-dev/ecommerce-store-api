import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import {
  HandlePaymentCompletedUseCase,
  HandlePaymentCompletedDto,
  HandlePaymentCompletedResult,
} from '../../core/application/usecases/handle-payment-completed/handle-payment-completed.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';

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
