import { Injectable } from '@nestjs/common';
import {
  PaymentGateway,
  CreatePaymentIntentInput,
  PaymentIntentResult,
  ProcessRefundInput,
} from '../../core/application/ports/payment.gateway';
import { CreatePaymentIntentUseCase } from '../../../payments/core/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { ProcessRefundUseCase } from '../../../payments/core/application/usecases/process-refund/process-refund.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModulePaymentGateway implements PaymentGateway {
  constructor(
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
    private readonly processRefundUseCase: ProcessRefundUseCase,
  ) {}

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
      return ErrorFactory.InfrastructureError(
        'Failed to process refund',
        result.error,
      );
    }

    return Result.success(undefined);
  }
}
