import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment } from '../../../domain/entities/payment';
import { PaymentProvider } from '../../ports/payment-provider';
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
  AppError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {
    super();
  }

  async execute(
    dto: CreatePaymentIntentCommand,
  ): Promise<Result<CreatePaymentIntentResult, AppError>> {
    // 1. Validate amount as Money
    const moneyResult = Money.create(dto.amount, dto.currency);
    if (isFailure(moneyResult)) return moneyResult;

    // 2. Persist PENDING Payment first
    const initialPayment = Payment.create(
      null,
      dto.orderId,
      dto.amount,
      dto.currency,
      dto.paymentMethod,
      dto.userId,
      dto.metadata ? JSON.stringify(dto.metadata) : undefined,
    );

    const saveResult = await this.paymentRepository.save(initialPayment);
    if (isFailure(saveResult)) return saveResult;

    const payment = saveResult.value;
    if (payment.id === null) {
      return ErrorFactory.UseCaseError('Payment was saved without an id');
    }

    // 3. Initiate Payment via Provider with idempotency key
    const initiateResult = await this.paymentProvider.initiatePayment({
      amount: moneyResult.value,
      metadata: dto.metadata,
      idempotencyKey: `payment-intent-${payment.id}`,
    });
    if (isFailure(initiateResult)) return initiateResult;

    const { providerReference, nextAction } = initiateResult.value;

    // 4. Set Payment Intent Details
    const setIntentResult = payment.setPaymentIntent(
      providerReference,
      nextAction.clientSecret,
    );
    if (isFailure(setIntentResult)) return setIntentResult;

    // 5. Update Payment in repository
    const updateResult = await this.paymentRepository.update(payment);
    if (isFailure(updateResult)) return updateResult;

    return Result.success({
      paymentId: payment.id,
      clientSecret: nextAction.clientSecret,
    });
  }
}
