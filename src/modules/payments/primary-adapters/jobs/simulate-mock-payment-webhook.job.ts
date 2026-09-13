import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import {
  HandlePaymentWebhookService,
  PaymentWebhookResult,
} from '../../core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../core/domain/value-objects/payment-event-type';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
export interface SimulateMockPaymentWebhookProps {
  paymentIntentId: string;
  transactionId?: string;
  metadata?: Record<string, string>;
  amount?: number;
  currency?: string;
}

@Injectable()
export class SimulateMockPaymentWebhookJob extends BaseJobHandler<
  SimulateMockPaymentWebhookProps,
  PaymentWebhookResult
> {
  protected readonly logger = new Logger(SimulateMockPaymentWebhookJob.name);

  constructor(
    private readonly handlePaymentWebhookService: HandlePaymentWebhookService,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<SimulateMockPaymentWebhookProps>,
  ): Promise<Result<PaymentWebhookResult, AppError>> {
    const { paymentIntentId, transactionId, metadata, amount, currency } =
      job.data;
    this.logger.log(
      `Processing simulated mock payment webhook for intent ${paymentIntentId}${amount && currency ? ` (${amount} ${currency})` : ''}`,
    );

    const result = await this.handlePaymentWebhookService.execute({
      paymentIntentId,
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: transactionId || paymentIntentId,
      metadata,
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    return Result.success(result.value);
  }
}
