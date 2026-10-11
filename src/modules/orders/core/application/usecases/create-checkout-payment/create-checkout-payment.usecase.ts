import { Injectable } from '@nestjs/common';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import {
  PaymentGateway,
  CreatePaymentIntentInput,
  PaymentIntentResult,
} from '../../ports/payment.gateway';

@Injectable()
export class CreateCheckoutPaymentUseCase implements UseCase<
  CreatePaymentIntentInput,
  PaymentIntentResult,
  AppError
> {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  async execute(
    input: CreatePaymentIntentInput,
  ): Promise<Result<PaymentIntentResult, AppError>> {
    const result = await this.paymentGateway.createPaymentIntent(input);

    if (isFailure(result)) {
      return result;
    }

    return Result.success(result.value);
  }
}
