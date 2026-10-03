// src/modules/payments/core/application/services/handle-payment-webhook/handle-payment-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { Payment } from '../../../domain/entities/payment';
import { PaymentEventsScheduler } from '../../../domain/schedulers/payment-events.scheduler';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';

export interface PaymentWebhookDto {
  paymentIntentId: string;
  eventType: PaymentEventType;
  transactionId?: string;
  failureReason?: string;
  metadata?: Record<string, string>;
  amountMinor?: number;
  currency?: string;
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
  ): Promise<Result<PaymentWebhookResult, AppError>> {
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
        return this.handlePaymentSuccess(payment, dto);
      case PaymentEventType.FAILED:
        return this.handlePaymentFailure(payment, dto);
      default: {
        // Exhaustive check to ensure all event types are handled
        const _exhaustiveCheck: never = dto.eventType;
        return ErrorFactory.ServiceError(
          `Unhandled event type: ${_exhaustiveCheck as string}`,
        );
      }
    }
  }

  private async handlePaymentSuccess(
    payment: Payment,
    dto: PaymentWebhookDto,
  ): Promise<Result<PaymentWebhookResult, AppError>> {
    const reservationId = dto.metadata?.reservationId
      ? Number(dto.metadata.reservationId)
      : undefined;
    const cartId = dto.metadata?.cartId
      ? Number(dto.metadata.cartId)
      : undefined;

    // 1. Redelivery check: if already COMPLETED, re-emit completed event and return success
    if (payment.status === PaymentStatusType.COMPLETED) {
      this.logger.log(
        `Payment ${payment.id} already COMPLETED, re-emitting completed event for order ${payment.orderId}`,
      );
      return this.emitCompleted(
        payment,
        dto.transactionId,
        reservationId,
        cartId,
      );
    }

    // 2. Succeeded event on FAILED or CANCELLED payment: log error and return ServiceError
    if (
      payment.status === PaymentStatusType.FAILED ||
      payment.status === PaymentStatusType.CANCELLED
    ) {
      this.logger.error(
        `Payment ${payment.id} succeeded but is already in ${payment.status} status`,
      );
      return ErrorFactory.ServiceError(
        `Payment ${payment.id} is already in ${payment.status} status`,
      );
    }

    // 3. Amount and currency validation before payment.complete()
    if (dto.amountMinor !== undefined) {
      const expectedAmountMinor = Math.round(payment.amount * 100);
      if (dto.amountMinor !== expectedAmountMinor) {
        return ErrorFactory.ServiceError(
          `Payment amount mismatch: expected ${expectedAmountMinor}, received ${dto.amountMinor}`,
        );
      }
    }

    if (dto.currency !== undefined) {
      if (dto.currency.toLowerCase() !== payment.currency.toLowerCase()) {
        return ErrorFactory.ServiceError(
          `Payment currency mismatch: expected ${payment.currency}, received ${dto.currency}`,
        );
      }
    }

    // 4. Complete payment
    const completeResult = payment.complete(dto.transactionId);
    if (isFailure(completeResult)) {
      return ErrorFactory.ServiceError(
        'Failed to complete payment',
        completeResult.error,
      );
    }

    // 5. Save payment
    const savePaymentResult = await this.paymentRepository.update(payment);
    if (isFailure(savePaymentResult)) {
      return savePaymentResult;
    }

    // 6. Emit completed event and return result
    return this.emitCompleted(
      payment,
      dto.transactionId,
      reservationId,
      cartId,
    );
  }

  private async handlePaymentFailure(
    payment: Payment,
    dto: PaymentWebhookDto,
  ): Promise<Result<PaymentWebhookResult, AppError>> {
    const reservationId = dto.metadata?.reservationId
      ? Number(dto.metadata.reservationId)
      : undefined;

    // 1. Redelivery check: if already FAILED, re-emit failed event and return success
    if (payment.status === PaymentStatusType.FAILED) {
      this.logger.log(
        `Payment ${payment.id} already FAILED, re-emitting failed event for order ${payment.orderId}`,
      );
      return this.emitFailed(payment, dto.failureReason, reservationId);
    }

    // 2. Late or out of order failure on already COMPLETED payment: log warning and ignore
    if (payment.status === PaymentStatusType.COMPLETED) {
      this.logger.warn(
        `Payment ${payment.id} received failed event but is already COMPLETED. Ignoring.`,
      );
      return Result.success({
        orderId: payment.orderId,
        paymentId: payment.id!,
        status: PaymentStatusType.COMPLETED,
      });
    }

    // 3. Fail payment
    const failResult = payment.fail(dto.failureReason || 'Payment failed');
    if (isFailure(failResult)) {
      return ErrorFactory.ServiceError(
        'Failed to mark payment as failed',
        failResult.error,
      );
    }

    // 4. Save payment
    const savePaymentResult = await this.paymentRepository.update(payment);
    if (isFailure(savePaymentResult)) {
      return savePaymentResult;
    }

    // 5. Emit failed event and return result
    return this.emitFailed(payment, dto.failureReason, reservationId);
  }

  private async emitCompleted(
    payment: Payment,
    transactionId?: string,
    reservationId?: number,
    cartId?: number,
  ): Promise<Result<PaymentWebhookResult, InfrastructureError>> {
    const emitResult = await this.paymentEventsScheduler.emitPaymentCompleted({
      orderId: payment.orderId,
      paymentId: payment.id!,
      transactionId: transactionId || payment.transactionId || undefined,
      reservationId,
      cartId,
    });

    if (isFailure(emitResult)) {
      return emitResult;
    }

    this.logger.log(
      `Payment ${payment.id} succeeded, event emitted for order ${payment.orderId}`,
    );

    return Result.success({
      orderId: payment.orderId,
      paymentId: payment.id!,
      status: PaymentStatusType.COMPLETED,
    });
  }

  private async emitFailed(
    payment: Payment,
    failureReason?: string,
    reservationId?: number,
  ): Promise<Result<PaymentWebhookResult, InfrastructureError>> {
    const emitResult = await this.paymentEventsScheduler.emitPaymentFailed({
      orderId: payment.orderId,
      paymentId: payment.id!,
      reason: failureReason || payment.failureReason || undefined,
      reservationId,
    });

    if (isFailure(emitResult)) {
      return emitResult;
    }

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
