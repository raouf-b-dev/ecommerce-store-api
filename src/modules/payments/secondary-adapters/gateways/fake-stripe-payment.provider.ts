import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  AuthorizeResult,
  ProviderOperationResult,
  RefundParams,
} from '../../core/application/ports/payment-provider';
import { PaymentProviderId } from '../../core/domain/value-objects/payment-provider-id';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { toErrorMessage } from '../../../../shared-kernel/infra/lang/error.utils';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import { EnvConfigService } from '../../../../config/env-config.service';
import { STRIPE_PAYMENT_PROVIDER_ID } from './stripe-provider-id';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

export const SIMULATED_WEBHOOK_DELAY_MS = 1000;

@Injectable()
export class FakeStripePaymentProvider extends PaymentProvider {
  private readonly logger = new Logger(FakeStripePaymentProvider.name);
  readonly id: PaymentProviderId = STRIPE_PAYMENT_PROVIDER_ID;

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
    const sanitizedKey = params.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const paymentIntentId = `pi_${sanitizedKey}`;
    const clientSecret = `${paymentIntentId}_secret_${sanitizedKey}`;

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
              params.idempotencyKey,
            ),
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
      nextAction: {
        type: 'confirm_on_client',
        clientSecret,
      },
    });
  }

  authorize(): Promise<Result<AuthorizeResult, InfrastructureError>> {
    const providerReference = `pi_auth_${uuidv4().replace(/-/g, '')}`;
    return Promise.resolve(
      Result.success({
        outcome: 'authorized',
        providerReference,
      }),
    );
  }

  capture(
    providerReference: string,
    _amount: Money,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>> {
    return Promise.resolve(
      Result.success({
        providerReference,
      }),
    );
  }

  refund(
    params: RefundParams,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>> {
    return Promise.resolve(
      Result.success({
        providerReference: params.providerReference,
      }),
    );
  }
}
