// src/modules/payments/application/usecases/handle-payment-webhook/handle-payment-webhook.usecase.ts
import { Injectable, Logger } from '@nestjs/common';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { Payment } from '../../../domain/entities/payment';
import { PaymentEventsScheduler } from '../../../domain/schedulers/payment-events.scheduler';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';
import { ServiceError } from '../../../../../core/errors/service-error';

export interface PaymentWebhookDto {
  paymentIntentId: string;
  eventType: PaymentEventType;
  transactionId?: string;
  failureReason?: string;
  metadata?: Record<string, string>;
}

export interface PaymentWebhookResult {
  orderId: number;
  paymentId: number;
  status: PaymentStatusType;
}

@Injectable()
export class HandlePaymentWebhookService {
  private readonly logger = new Logger(HandlePaymentWebhookService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentEventsScheduler: PaymentEventsScheduler,
  ) {}

  async execute(
    dto: PaymentWebhookDto,
  ): Promise<Result<PaymentWebhookResult, ServiceError>> {
    try {
      this.logger.log(
        `Processing webhook: ${dto.eventType} for intent ${dto.paymentIntentId}`,
      );

      // 1. Find payment by gateway payment intent ID
      const paymentResult =
        await this.paymentRepository.findByGatewayPaymentIntentId(
          dto.paymentIntentId,
        );

      if (isFailure(paymentResult)) {
        return ErrorFactory.ServiceError(
          `Payment not found for intent: ${dto.paymentIntentId}`,
          paymentResult.error,
        );
      }

      const payment = paymentResult.value;

      // 2. Handle based on event type
      switch (dto.eventType) {
        case PaymentEventType.SUCCEEDED:
          return this.handlePaymentSuccess(
            payment,
            dto.transactionId,
            dto.metadata?.reservationId
              ? Number(dto.metadata.reservationId)
              : undefined,
            dto.metadata?.cartId ? Number(dto.metadata.cartId) : undefined,
          );
        case PaymentEventType.FAILED:
          return this.handlePaymentFailure(
            payment,
            dto.failureReason,
            dto.metadata?.reservationId
              ? Number(dto.metadata.reservationId)
              : undefined,
          );
        default: {
          // Exhaustive check to ensure all event types are handled
          const _exhaustiveCheck: never = dto.eventType;
          return ErrorFactory.ServiceError(
            `Unhandled event type: ${_exhaustiveCheck as string}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error processing payment webhook:', error);
      return ErrorFactory.ServiceError(
        'Unexpected error processing payment webhook',
        error,
      );
    }
  }

  private async handlePaymentSuccess(
    payment: Payment,
    transactionId?: string,
    reservationId?: number,
    cartId?: number,
  ): Promise<Result<PaymentWebhookResult, ServiceError>> {
    // Complete payment
    const completeResult = payment.complete(transactionId);
    if (isFailure(completeResult)) {
      return ErrorFactory.ServiceError(
        'Failed to complete payment',
        completeResult.error,
      );
    }

    // Save payment
    const savePaymentResult = await this.paymentRepository.save(payment);
    if (isFailure(savePaymentResult)) {
      return savePaymentResult;
    }

    // Emit event with post-payment data
    await this.paymentEventsScheduler.emitPaymentCompleted({
      orderId: payment.orderId,
      paymentId: payment.id!,
      transactionId,
      reservationId,
      cartId,
    });

    this.logger.log(
      `Payment ${payment.id} succeeded, event emitted for order ${payment.orderId}`,
    );

    return Result.success({
      orderId: payment.orderId,
      paymentId: payment.id!,
      status: PaymentStatusType.COMPLETED,
    });
  }

  private async handlePaymentFailure(
    payment: Payment,
    failureReason?: string,
    reservationId?: number,
  ): Promise<Result<PaymentWebhookResult, ServiceError>> {
    // Fail payment
    const failResult = payment.fail(failureReason || 'Payment failed');
    if (isFailure(failResult)) {
      return ErrorFactory.ServiceError(
        'Failed to mark payment as failed',
        failResult.error,
      );
    }

    // Save payment
    const savePaymentResult = await this.paymentRepository.save(payment);
    if (isFailure(savePaymentResult)) {
      return savePaymentResult;
    }

    // Emit event with reservation data for compensation
    await this.paymentEventsScheduler.emitPaymentFailed({
      orderId: payment.orderId,
      paymentId: payment.id!,
      reason: failureReason,
      reservationId,
    });

    this.logger.log(
      `Payment ${payment.id} failed, event emitted for order ${payment.orderId}`,
    );

    return Result.success({
      orderId: payment.orderId,
      paymentId: payment.id!,
      status: PaymentStatusType.FAILED,
    });
  }
}
