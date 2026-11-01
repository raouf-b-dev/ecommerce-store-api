import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { ProcessRefundInput } from '../../core/application/ports/payment.gateway';
import { RefundAmount } from '../../core/domain/schedulers/order.scheduler';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

/** BullMQ JSON shape for a refund amount. Money cannot travel on the wire. */
export type RefundPaymentJobAmount =
  { amountMinor: number; currency: string } | { mode: 'remaining' };
export type RefundPaymentJobData = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
} & RefundPaymentJobAmount;

/**
 * Runtime job data may still be a pre-deploy payload with neither
 * mode nor amountMinor; deserialize fails loudly for those.
 */
type RefundPaymentJobDataRuntime = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
  mode?: 'remaining';
  amountMinor?: number;
  currency?: string;
};

/** Serialize domain RefundAmount for the BullMQ payload. */
export function toRefundJobAmount(
  refund: RefundAmount,
): RefundPaymentJobAmount {
  if ('mode' in refund) {
    return { mode: 'remaining' };
  }
  return {
    amountMinor: refund.amount.value,
    currency: refund.amount.currency,
  };
}

/** Rebuild ProcessRefundInput from job data. Legacy payloads fail loudly. */
export function toProcessRefundInput(
  data: RefundPaymentJobDataRuntime,
): Result<ProcessRefundInput, UseCaseError> {
  if (data.mode === 'remaining') {
    return Result.success({
      paymentId: data.paymentId,
      reason: data.reason,
      mode: 'remaining',
    });
  }

  if (
    typeof data.amountMinor === 'number' &&
    typeof data.currency === 'string'
  ) {
    const moneyResult = Money.create(data.amountMinor, data.currency);
    if (moneyResult.isFailure) {
      return ErrorFactory.UseCaseError(moneyResult.error.message, {
        cause: moneyResult.error,
      });
    }
    return Result.success({
      paymentId: data.paymentId,
      reason: data.reason,
      amount: moneyResult.value,
    });
  }

  return ErrorFactory.UseCaseError(
    'legacy refund job payload: let the refund-payment queue finish before deploying',
  );
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
    const inputResult = toProcessRefundInput(job.data);
    if (isFailure(inputResult)) {
      return inputResult;
    }
    const input = inputResult.value;
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

function refundAmountLabel(input: ProcessRefundInput): string {
  if ('mode' in input) {
    return 'remaining';
  }
  return input.amount.toDecimalString();
}
