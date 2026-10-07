import { Injectable } from '@nestjs/common';
import {
  PaymentGateway,
  CreatePaymentInput,
  CreatedPayment,
  CreatePaymentIntentInput,
  PaymentIntentResult,
  ProcessRefundInput,
} from '../../core/application/ports/payment.gateway';
import { CreatePaymentUseCase } from '../../../payments/core/application/usecases/create-payment/create-payment.usecase';
import { CreatePaymentIntentUseCase } from '../../../payments/core/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { ProcessRefundUseCase } from '../../../payments/core/application/usecases/process-refund/process-refund.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';

@Injectable()
export class ModulePaymentGateway implements PaymentGateway {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
    private readonly processRefundUseCase: ProcessRefundUseCase,
  ) {}

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<Result<CreatedPayment, AppError>> {
    const result = await this.createPaymentUseCase.execute({
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      paymentMethodDetails: input.paymentMethodDetails,
      userId: input.userId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(result)) return result;

    const payment = result.value;
    if (payment.id === null) {
      return ErrorFactory.InfrastructureError(
        'Payment was saved without an id',
      );
    }

    return Result.success({
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
      gatewayPaymentIntentId: payment.gatewayPaymentIntentId,
      paymentMethodInfo: payment.paymentMethodInfo,
      refundedAmount: payment.refundedAmount,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      updatedAt: payment.updatedAt,
    });
  }

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>> {
    const result = await this.createPaymentIntentUseCase.execute({
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      userId: input.userId,
      metadata: input.metadata,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to create payment intent',
        result.error,
      );
    }

    return Result.success({
      paymentId: result.value.paymentId,
      clientSecret: result.value.clientSecret,
    });
  }

  async processRefund(
    input: ProcessRefundInput,
  ): Promise<Result<void, InfrastructureError>> {
    const result = await this.processRefundUseCase.execute({
      paymentId: input.paymentId,
      amount: input.amount,
      reason: input.reason,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError('Failed to process refund', {
        cause: result.error,
        retryable: result.error.retryable,
      });
    }

    return Result.success(undefined);
  }
}
