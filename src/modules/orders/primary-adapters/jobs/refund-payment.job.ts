import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { RefundPaymentCommand } from '../../core/application/commands/refund-payment.command';
import {
  RefundPaymentPayload,
  toRefundPaymentCommand,
} from '../../core/application/messaging/refund-payment.payload';

@Injectable()
export class RefundPaymentStep extends BaseJobHandler<
  RefundPaymentPayload,
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
    job: Job<RefundPaymentPayload>,
  ): Promise<Result<void, AppError>> {
    const commandResult = toRefundPaymentCommand(job.data);
    if (isFailure(commandResult)) {
      return commandResult;
    }
    const command = commandResult.value;
    const amountLabel = refundAmountLabel(command);
    this.logger.log(
      `Refunding payment ${command.paymentId} for amount ${amountLabel}...`,
    );

    const result = await this.refundPaymentUseCase.execute(command);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Payment ${command.paymentId} refunded.`);
    return Result.success(undefined);
  }
}

function refundAmountLabel(command: RefundPaymentCommand): string {
  if ('mode' in command) {
    return 'remaining';
  }
  return command.amount.toDecimalString();
}
