import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { StripeSignatureService } from '../../../infrastructure/services/stripe-signature.service';
import {
  HandlePaymentWebhookService,
  PaymentWebhookResult,
} from '../../services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';

export interface StripeWebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      metadata: Record<string, string>;
      last_payment_error?: {
        message: string;
      };
    };
  };
}

export interface StripeWebhookDto {
  signature: string;
  payload: StripeWebhookPayload;
}

@Injectable()
export class HandleStripeWebhookUseCase extends UseCase<
  StripeWebhookDto,
  PaymentWebhookResult | null,
  UseCaseError
> {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly stripeSignatureService: StripeSignatureService,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookService,
  ) {
    super();
  }

  async execute(
    dto: StripeWebhookDto,
  ): Promise<Result<PaymentWebhookResult | null, UseCaseError>> {
    try {
      // 1. Validate signature
      if (!dto.signature) {
        return ErrorFactory.UseCaseError('Missing stripe-signature header');
      }

      const isValid = this.stripeSignatureService.verify(
        dto.payload,
        dto.signature,
      );
      if (!isValid) {
        return ErrorFactory.UseCaseError('Invalid Stripe webhook signature');
      }

      // 2. Extract and map event type
      const stripeEventType = dto.payload.type;
      const internalEventType = this.mapEventType(stripeEventType);

      if (!internalEventType) {
        this.logger.debug(`Ignoring Stripe event type: ${stripeEventType}`);
        return Result.success(null); // Ignored event, not an error
      }

      // 3. Extract payment intent data
      const paymentIntent = dto.payload.data?.object;
      if (!paymentIntent?.id) {
        return ErrorFactory.UseCaseError(
          'Invalid Stripe webhook payload: missing payment intent',
        );
      }

      // 4. Delegate to HandlePaymentWebhookUseCase
      const result = await this.handlePaymentWebhookUseCase.execute({
        paymentIntentId: paymentIntent.id,
        eventType: internalEventType,
        transactionId: paymentIntent.id,
        metadata: paymentIntent.metadata,
        failureReason: paymentIntent.last_payment_error?.message,
      });

      if (isFailure(result)) {
        this.logger.error(
          `Stripe webhook processing failed: ${result.error.message}`,
        );
        return result;
      }

      return Result.success(result.value);
    } catch (error) {
      this.logger.error('Unexpected error processing Stripe webhook:', error);
      return ErrorFactory.UseCaseError(
        'Unexpected error processing Stripe webhook',
        error,
      );
    }
  }

  private mapEventType(stripeEventType: string): PaymentEventType | null {
    switch (stripeEventType) {
      case 'payment_intent.succeeded':
        return PaymentEventType.SUCCEEDED;
      case 'payment_intent.payment_failed':
        return PaymentEventType.FAILED;
      default:
        return null;
    }
  }
}
