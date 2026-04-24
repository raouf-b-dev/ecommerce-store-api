import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import {
  HandlePaymentFailedUseCase,
  HandlePaymentFailedDto,
  HandlePaymentFailedResult,
} from '../../core/application/usecases/handle-payment-failed/handle-payment-failed.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

@Injectable()
export class PaymentFailedStep extends BaseJobHandler<
  HandlePaymentFailedDto,
  HandlePaymentFailedResult
> {
  protected readonly logger = new Logger(PaymentFailedStep.name);

  constructor(
    private readonly handlePaymentFailedUseCase: HandlePaymentFailedUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
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
