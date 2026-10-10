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
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
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

    // 2. Look up existing payment by order ID
    const existingResult = await this.paymentRepository.findByOrderId(
      dto.orderId,
    );
    if (isFailure(existingResult)) return existingResult;

    const existingPayments = existingResult.value;
    const pendingPayment = existingPayments.find(
      (p) => p.status === PaymentStatusType.PENDING,
    );

    let payment: Payment;

    if (pendingPayment) {
      if (
        pendingPayment.gatewayPaymentIntentId &&
        pendingPayment.gatewayClientSecret &&
        pendingPayment.id !== null
      ) {
        return Result.success({
          paymentId: pendingPayment.id,
          clientSecret: pendingPayment.gatewayClientSecret,
        });
      }
      payment = pendingPayment;
    } else if (existingPayments.length === 0) {
      const initialPayment = Payment.create({
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        provider: this.paymentProvider.id,
        userId: dto.userId,
        paymentMethodInfo: dto.metadata ? JSON.stringify(dto.metadata) : null,
      });

      const saveResult = await this.paymentRepository.save(initialPayment);
      if (isFailure(saveResult)) return saveResult;
      payment = saveResult.value;
    } else {
      return ErrorFactory.UseCaseError(
        `Order ${dto.orderId} does not have a pending payment to initiate intent`,
      );
    }

    if (payment.id === null) {
      return ErrorFactory.UseCaseError('Payment has no ID');
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
