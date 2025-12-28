import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PayPalSignatureService } from '../../../infrastructure/services/paypal-signature.service';
import {
  HandlePaymentWebhookService,
  PaymentWebhookResult,
} from '../../services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';

export interface PayPalWebhookPayload {
  event_type: string;
  resource: {
    id: string;
    status_details?: {
      reason: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}

export interface PayPalWebhookDto {
  headers: any;
  payload: PayPalWebhookPayload;
}

@Injectable()
export class HandlePayPalWebhookUseCase extends UseCase<
  PayPalWebhookDto,
  PaymentWebhookResult | null,
  UseCaseError
> {
  private readonly logger = new Logger(HandlePayPalWebhookUseCase.name);

  constructor(
    private readonly payPalSignatureService: PayPalSignatureService,
    private readonly handlePaymentWebhookUseCase: HandlePaymentWebhookService,
  ) {
    super();
  }

  async execute(
    dto: PayPalWebhookDto,
  ): Promise<Result<PaymentWebhookResult | null, UseCaseError>> {
    try {
      // 1. Validate signature
      const isValid = this.payPalSignatureService.verify(
        dto.headers,
        dto.payload,
      );
      if (!isValid) {
        return ErrorFactory.UseCaseError('Invalid PayPal webhook signature');
      }

      // 2. Extract and map event type
      const paypalEventType = dto.payload.event_type;
      const internalEventType = this.mapEventType(paypalEventType);

      if (!internalEventType) {
        this.logger.debug(`Ignoring PayPal event type: ${paypalEventType}`);
        return Result.success(null); // Ignored event, not an error
      }

      // 3. Extract payment data from PayPal resource
      const resource = dto.payload.resource;
      if (!resource) {
        return ErrorFactory.UseCaseError(
          'Invalid PayPal webhook payload: missing resource',
        );
      }

      // PayPal uses different ID structures - try to find the payment intent ID
      const paymentIntentId = this.extractPaymentIntentId(resource);
      if (!paymentIntentId) {
        return ErrorFactory.UseCaseError(
          'Invalid PayPal webhook payload: could not determine payment intent ID',
        );
      }

      // 4. Delegate to HandlePaymentWebhookUseCase
      const result = await this.handlePaymentWebhookUseCase.execute({
        paymentIntentId,
        eventType: internalEventType,
        transactionId: resource.id,
        metadata: {},
        failureReason: resource.status_details?.reason,
      });

      if (isFailure(result)) {
        this.logger.error(
          `PayPal webhook processing failed: ${result.error.message}`,
        );
        return result;
      }

      return Result.success(result.value);
    } catch (error) {
      this.logger.error('Unexpected error processing PayPal webhook:', error);
      return ErrorFactory.UseCaseError(
        'Unexpected error processing PayPal webhook',
        error,
      );
    }
  }

  private mapEventType(paypalEventType: string): PaymentEventType | null {
    switch (paypalEventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        return PaymentEventType.SUCCEEDED;
      case 'PAYMENT.CAPTURE.DENIED':
        return PaymentEventType.FAILED;
      default:
        return null;
    }
  }

  private extractPaymentIntentId(resource: any): string | null {
    // Try supplementary_data first (preferred for order-based flows)
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    if (orderId) {
      return orderId;
    }

    // Fallback to resource ID
    if (resource.id) {
      this.logger.warn(
        'Could not find order_id in PayPal webhook resource, using resource.id',
      );
      return resource.id;
    }

    return null;
  }
}
