import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { HandlePayPalWebhookUseCase } from '../../../application/usecases/handle-paypal-webhook/handle-paypal-webhook.usecase';
import { PaymentWebhookResult } from '../../../application/services/handle-payment-webhook/handle-payment-webhook.service';

@Injectable()
export class PayPalWebhookController {
  constructor(
    private readonly handlePayPalWebhookUseCase: HandlePayPalWebhookUseCase,
  ) {}

  async handle(
    headers: any,
    body: any,
  ): Promise<Result<PaymentWebhookResult | null, ControllerError>> {
    try {
      const result = await this.handlePayPalWebhookUseCase.execute({
        headers,
        payload: body,
      });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'PayPal webhook processing failed',
          result.error,
        );
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError(
        'Unexpected error processing PayPal webhook',
        error,
      );
    }
  }
}
