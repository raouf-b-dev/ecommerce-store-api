// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
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
  UseCaseError
> {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  async execute(
    input: CreatePaymentIntentInput,
  ): Promise<Result<PaymentIntentResult, UseCaseError>> {
    const result = await this.paymentGateway.createPaymentIntent(input);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to create checkout payment',
        result.error,
      );
    }

    return Result.success(result.value);
  }
}
