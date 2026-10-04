import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { StripeSignatureVerifier } from '../../ports/stripe-signature-verifier';
import {
  HandlePaymentWebhookService,
  PaymentWebhookResult,
} from '../../services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';

export interface StripeWebhookCommand {
  signature?: string;
  rawBody: Buffer | undefined;
}

@Injectable()
export class HandleStripeWebhookUseCase extends UseCase<
  StripeWebhookCommand,
  PaymentWebhookResult | null,
  AppError
> {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly stripeSignatureVerifier: StripeSignatureVerifier,
    private readonly handlePaymentWebhookService: HandlePaymentWebhookService,
  ) {
    super();
  }

  async execute(
    dto: StripeWebhookCommand,
  ): Promise<Result<PaymentWebhookResult | null, AppError>> {
    // 1. Validate signature presence
    if (!dto.signature?.trim()) {
      return ErrorFactory.UseCaseError(
        'Missing stripe-signature header',
        undefined,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Validate raw body presence
    if (!dto.rawBody || dto.rawBody.length === 0) {
      return ErrorFactory.UseCaseError(
        'Missing raw request body',
        undefined,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Verify signature over raw bytes and extract payload
    const payload = this.stripeSignatureVerifier.verify(
      dto.rawBody,
      dto.signature,
    );
    if (!payload) {
      return ErrorFactory.UseCaseError(
        'Invalid Stripe webhook signature',
        undefined,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Extract and map event type
    const stripeEventType = payload.type;
    const internalEventType = this.mapEventType(stripeEventType);

    if (!internalEventType) {
      this.logger.debug(`Ignoring Stripe event type: ${stripeEventType}`);
      return Result.success(null);
    }

    // 5. Extract payment intent data
    const paymentIntent = payload.data?.object;
    if (!paymentIntent?.id) {
      return ErrorFactory.UseCaseError(
        'Invalid Stripe webhook payload: missing payment intent',
        undefined,
        HttpStatus.BAD_REQUEST,
      );
    }

    const amountMinor = paymentIntent.amount_received ?? paymentIntent.amount;
    const currency = paymentIntent.currency;

    // 6. Delegate to HandlePaymentWebhookService
    const result = await this.handlePaymentWebhookService.execute({
      paymentIntentId: paymentIntent.id,
      eventType: internalEventType,
      transactionId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      failureReason: paymentIntent.last_payment_error?.message,
      ...(amountMinor !== undefined ? { amountMinor } : {}),
      ...(currency !== undefined ? { currency } : {}),
    });

    if (isFailure(result)) {
      this.logger.error(
        `Stripe webhook processing failed: ${result.error.message}`,
      );
      return result;
    }

    return Result.success(result.value);
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
