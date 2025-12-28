import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { HandleStripeWebhookUseCase } from '../../../application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { PaymentWebhookResult } from '../../../application/services/handle-payment-webhook/handle-payment-webhook.service';

@Injectable()
export class StripeWebhookController {
  constructor(
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
  ) {}

  async handle(
    signature: string,
    body: any,
  ): Promise<Result<PaymentWebhookResult | null, ControllerError>> {
    try {
      const result = await this.handleStripeWebhookUseCase.execute({
        signature,
        payload: body,
      });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'Stripe webhook processing failed',
          result.error,
        );
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError(
        'Unexpected error processing Stripe webhook',
        error,
      );
    }
  }
}
