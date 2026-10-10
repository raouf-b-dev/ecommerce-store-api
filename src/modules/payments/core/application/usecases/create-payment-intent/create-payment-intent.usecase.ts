import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment } from '../../../domain/entities/payment';
import { PaymentProviderResolver } from '../../ports/payment-provider-resolver';
import { CreatePaymentIntentCommand } from '../../commands/create-payment-intent.command';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';

export interface CreatePaymentIntentResult {
  paymentId: number;
  clientSecret: string;
}

@Injectable()
export class CreatePaymentIntentUseCase extends UseCase<
  CreatePaymentIntentCommand,
  CreatePaymentIntentResult,
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderResolver: PaymentProviderResolver,
  ) {
    super();
  }

  async execute(
    dto: CreatePaymentIntentCommand,
  ): Promise<Result<CreatePaymentIntentResult, UseCaseError>> {
    // 1. Get Provider
    const provider = this.paymentProviderResolver.getProvider(
      dto.paymentMethod,
    );

    // 2. Validate amount as Money
    const moneyResult = Money.create(dto.amount, dto.currency);
    if (isFailure(moneyResult)) {
      return ErrorFactory.UseCaseError(
        `Invalid payment amount: ${moneyResult.error.message}`,
        moneyResult.error,
      );
    }

    // 3. Initiate Payment via Provider
    const initiateResult = await provider.initiatePayment({
      amount: moneyResult.value,
      metadata: dto.metadata,
    });

    if (isFailure(initiateResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to create payment intent: ${initiateResult.error.message}`,
        initiateResult.error,
      );
    }

    const { providerReference, nextAction } = initiateResult.value;
    const clientSecret = nextAction.clientSecret;

    // 4. Create Payment Entity
    const payment = Payment.create(
      null,
      dto.orderId,
      dto.amount,
      dto.currency,
      dto.paymentMethod,
      dto.userId,
      dto.metadata ? JSON.stringify(dto.metadata) : undefined,
    );

    // 5. Set Payment Intent Details
    const setIntentResult = payment.setPaymentIntent(
      providerReference,
      clientSecret,
    );

    if (isFailure(setIntentResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to set payment intent details',
        setIntentResult.error,
      );
    }

    // 6. Save Payment
    const saveResult = await this.paymentRepository.save(payment);

    if (isFailure(saveResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to save payment',
        saveResult.error,
      );
    }

    if (saveResult.value.id === null) {
      return ErrorFactory.UseCaseError('Payment was saved without an id');
    }

    return Result.success({
      paymentId: saveResult.value.id,
      clientSecret,
    });
  }
}
