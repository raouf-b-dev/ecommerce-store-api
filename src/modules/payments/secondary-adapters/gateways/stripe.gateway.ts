// src/modules/payments/infrastructure/gateways/stripe.gateway.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { IPaymentGateway } from '../../core/domain/gateways/payment-gateway.interface';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import {
  PaymentResult,
  PaymentIntentResult,
} from '../../core/domain/gateways/payment-result';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { toErrorMessage } from '../../../../shared-kernel/infra/lang/error.utils';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { EnvConfigService } from '../../../../config/env-config.service';

@Injectable()
export class StripeGateway implements IPaymentGateway {
  private readonly logger = new Logger(StripeGateway.name);

  constructor(
    @InjectQueue('payments') private readonly paymentsQueue: Queue,
    private readonly envConfigService: EnvConfigService,
  ) {}

  getMethod(): PaymentMethodType {
    return PaymentMethodType.STRIPE;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>> {
    // STUB: Simulate Stripe PaymentIntent creation
    const paymentIntentId = `pi_${uuidv4().replace(/-/g, '')}`;
    const clientSecret = `${paymentIntentId}_secret_${uuidv4().substring(0, 24)}`;

    // If auto-completion is configured, schedule simulated Stripe webhook arrival
    if (this.envConfigService.payments.mockAutoComplete) {
      try {
        await this.paymentsQueue.add(
          JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
          {
            paymentIntentId,
            transactionId: paymentIntentId,
            metadata,
            amount,
            currency,
          },
          { delay: 1000 },
        );
        this.logger.log(
          `Scheduled mock payment webhook auto-completion for intent ${paymentIntentId} (${amount} ${currency}) with 1000ms delay`,
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
      paymentIntentId,
      clientSecret,
      status: PaymentStatusType.PENDING,
    });
  }

  authorize(
    amount: number,
    currency: string,
    paymentMethodDetails?: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate Stripe authorization
    return Promise.resolve(
      Result.success({
        success: true,
        status: PaymentStatusType.AUTHORIZED,
        transactionId: `stripe_pi_${uuidv4()}`,
        metadata: {
          method: 'Stripe',
          amount,
          currency,
          details: paymentMethodDetails,
        },
      }),
    );
  }

  capture(
    transactionId: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate Stripe capture
    return Promise.resolve(
      Result.success({
        success: true,
        status: PaymentStatusType.CAPTURED,
        transactionId,
      }),
    );
  }

  refund(
    transactionId: string,
    amount: number,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate Stripe refund
    return Promise.resolve(
      Result.success({
        success: true,
        status: PaymentStatusType.REFUNDED,
        transactionId,
        metadata: {
          refundAmount: amount,
        },
      }),
    );
  }
}
