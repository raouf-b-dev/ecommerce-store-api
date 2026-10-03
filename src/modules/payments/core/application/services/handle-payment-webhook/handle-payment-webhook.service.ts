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
    const reservationId = dto.metadata?.reservationId
      ? Number(dto.metadata.reservationId)
      : undefined;
    const cartId = dto.metadata?.cartId
      ? Number(dto.metadata.cartId)
      : undefined;

    switch (dto.eventType) {
      case PaymentEventType.SUCCEEDED:
        return this.handlePaymentSuccess(payment, dto, reservationId, cartId);
      case PaymentEventType.FAILED:
        return this.handlePaymentFailure(payment, dto, reservationId);
      default: {
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
    reservationId?: number,
    cartId?: number,
  ): Promise<Result<PaymentWebhookResult, AppError>> {
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

    if (dto.amountMinor !== undefined) {
      const expectedAmountMinor = Math.round(payment.amount * 100);
      if (dto.amountMinor !== expectedAmountMinor) {
        return ErrorFactory.ServiceError(
          `Payment amount mismatch: expected ${expectedAmountMinor}, received ${dto.amountMinor}`,
        );
      }
    }

    if (
      dto.currency !== undefined &&
      dto.currency.toLowerCase() !== payment.currency.toLowerCase()
    ) {
      return ErrorFactory.ServiceError(
        `Payment currency mismatch: expected ${payment.currency}, received ${dto.currency}`,
      );
    }

    const completeResult = payment.complete(dto.transactionId);
    if (isFailure(completeResult)) {
      return ErrorFactory.ServiceError(
        'Failed to complete payment',
        completeResult.error,
      );
    }

    const savePaymentResult = await this.paymentRepository.update(payment);
    if (isFailure(savePaymentResult)) {
      return savePaymentResult;
    }

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
    reservationId?: number,
  ): Promise<Result<PaymentWebhookResult, AppError>> {
    if (payment.status === PaymentStatusType.FAILED) {
      this.logger.log(
        `Payment ${payment.id} already FAILED, re-emitting failed event for order ${payment.orderId}`,
      );
      return this.emitFailed(payment, dto.failureReason, reservationId);
    }

    if (
      payment.status !== PaymentStatusType.PENDING &&
      payment.status !== PaymentStatusType.AUTHORIZED
    ) {
      this.logger.warn(
        `Payment ${payment.id} received failed event but is in ${payment.status} status. Ignoring.`,
      );
      return Result.success({
        orderId: payment.orderId,
        paymentId: payment.id!,
        status: payment.status,
      });
    }

    const failResult = payment.fail(dto.failureReason || 'Payment failed');
    if (isFailure(failResult)) {
      return ErrorFactory.ServiceError(
        'Failed to mark payment as failed',
        failResult.error,
      );
    }

    const savePaymentResult = await this.paymentRepository.update(payment);
    if (isFailure(savePaymentResult)) {
      return savePaymentResult;
    }

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
      transactionId,
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
      reason: failureReason,
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
