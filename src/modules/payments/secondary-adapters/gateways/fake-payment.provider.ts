import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  ProviderOperationResult,
  RefundParams,
} from '../../core/application/ports/payment-provider';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { toErrorMessage } from '../../../../shared-kernel/infra/lang/error.utils';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import { EnvConfigService } from '../../../../config/env-config.service';

export const SIMULATED_WEBHOOK_DELAY_MS = 1000;

@Injectable()
export class FakePaymentProvider extends PaymentProvider {
  private readonly logger = new Logger(FakePaymentProvider.name);

  constructor(
    @InjectQueue('payments') private readonly paymentsQueue: Queue,
    private readonly envConfigService: EnvConfigService,
    private readonly jobConfigService: JobConfigService,
  ) {
    super();
  }

  async initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<Result<InitiatePaymentResult, InfrastructureError>> {
    const paymentIntentId = `pi_${uuidv4().replace(/-/g, '')}`;
    const clientSecret = `${paymentIntentId}_secret_${uuidv4().substring(0, 24)}`;

    if (this.envConfigService.payments.mockAutoComplete) {
      try {
        await this.paymentsQueue.add(
          JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
          {
            paymentIntentId,
            transactionId: paymentIntentId,
            metadata: params.metadata,
            amountMinor: params.amount.amount,
            currency: params.amount.currency,
          },
          {
            ...this.jobConfigService.getJobOptions(
              JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
            ),
            jobId: params.idempotencyKey,
            delay: SIMULATED_WEBHOOK_DELAY_MS,
          },
        );
        this.logger.log(
          `Scheduled mock payment webhook auto-completion for intent ${paymentIntentId} (${params.amount.amount} ${params.amount.currency}) with ${SIMULATED_WEBHOOK_DELAY_MS}ms delay`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to schedule mock payment webhook for intent ${paymentIntentId}`,
          error,
        );
        return ErrorFactory.InfrastructureError(
          `Failed to schedule mock payment webhook: ${toErrorMessage(error)}`,
          error,
        );
      }
    }

    return Result.success({
      providerReference: paymentIntentId,
      status: PaymentStatusType.PENDING,
      nextAction: {
        type: 'confirm_on_client',
        clientSecret,
      },
    });
  }

  authorize(): Promise<Result<ProviderOperationResult, InfrastructureError>> {
    return Promise.resolve(
      Result.success({
        providerReference: `pi_fake_${uuidv4().replace(/-/g, '')}`,
        status: PaymentStatusType.AUTHORIZED,
      }),
    );
  }

  capture(
    providerReference: string,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>> {
    return Promise.resolve(
      Result.success({
        providerReference,
        status: PaymentStatusType.CAPTURED,
      }),
    );
  }

  refund(
    params: RefundParams,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>> {
    return Promise.resolve(
      Result.success({
        providerReference: params.providerReference,
        status: PaymentStatusType.REFUNDED,
      }),
    );
  }
}
