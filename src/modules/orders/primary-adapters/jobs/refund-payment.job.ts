import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

export interface RefundPaymentJobData {
  orderId: number;
  paymentId: number;
  amount: number;
  reason: string;
  correlationId?: string;
}

@Injectable()
export class RefundPaymentStep extends BaseJobHandler<
  RefundPaymentJobData,
  void
> {
  protected readonly logger = new Logger(RefundPaymentStep.name);

  constructor(
    private readonly refundPaymentUseCase: RefundCheckoutPaymentUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<RefundPaymentJobData>,
  ): Promise<Result<void, AppError>> {
    const { paymentId, amount, reason } = job.data;

    this.logger.log(`Refunding payment ${paymentId} for amount ${amount}...`);

    const result = await this.refundPaymentUseCase.execute({
      paymentId,
      amount,
      reason,
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Payment ${paymentId} refunded.`);
    return Result.success(undefined);
  }
}
