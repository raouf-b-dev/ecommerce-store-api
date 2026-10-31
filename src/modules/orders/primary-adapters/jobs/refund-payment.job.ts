import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { ProcessRefundInput } from '../../core/application/ports/payment.gateway';

export type RefundPaymentJobData = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
} & ({ amount: number } | { mode: 'remaining' });

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
    const input = toProcessRefundInput(job.data);
    const amountLabel = refundAmountLabel(input);
    this.logger.log(
      `Refunding payment ${input.paymentId} for amount ${amountLabel}...`,
    );

    const result = await this.refundPaymentUseCase.execute(input);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Payment ${input.paymentId} refunded.`);
    return Result.success(undefined);
  }
}

function toProcessRefundInput(data: RefundPaymentJobData): ProcessRefundInput {
  if ('mode' in data) {
    return {
      paymentId: data.paymentId,
      reason: data.reason,
      mode: 'remaining',
    };
  }
  return {
    paymentId: data.paymentId,
    reason: data.reason,
    amount: data.amount,
  };
}

function refundAmountLabel(input: ProcessRefundInput): string {
  if ('mode' in input) {
    return 'remaining';
  }
  return String(input.amount);
}
