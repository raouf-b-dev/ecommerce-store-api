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
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

@Injectable()
export class PaymentCompletedStep extends BaseJobHandler<
  HandlePaymentCompletedDto,
  HandlePaymentCompletedResult
> {
  protected readonly logger = new Logger(PaymentCompletedStep.name);

  constructor(
    private readonly handlePaymentCompletedUseCase: HandlePaymentCompletedUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
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
