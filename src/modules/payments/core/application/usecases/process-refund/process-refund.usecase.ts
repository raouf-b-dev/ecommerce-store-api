import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment } from '../../../domain/entities/payment';
import { Refund } from '../../../domain/entities/refund';
import { PaymentProvider } from '../../ports/payment-provider';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import {
  isProcessRefundHttpCommand,
  isRemainingRefund,
  ProcessRefundUseCaseInput,
} from '../../commands/process-refund.command';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';
import { providerMismatchError } from '../../errors/provider-mismatch.error';

function isPositiveAmountMissing(input: ProcessRefundUseCaseInput): boolean {
  if (isProcessRefundHttpCommand(input)) {
    return input.majorUnits <= 0;
  }
  if (isRemainingRefund(input)) {
    return false;
  }
  return input.amount.amount <= 0;
}

/**
 * Resolve the refund Money from the use-case input and the loaded payment.
 * HTTP major units convert once here with payment.currency (Fowler Money).
 */
function resolveRefundMoney(
  input: ProcessRefundUseCaseInput,
  payment: Payment,
): Result<Money, AppError> {
  if (isProcessRefundHttpCommand(input)) {
    return Money.fromMajorUnits(input.majorUnits, payment.currency);
  }

  if (isRemainingRefund(input)) {
    return Money.create(payment.remainingAmount, payment.currency);
  }

  if (input.amount.currency !== payment.currency) {
    return ErrorFactory.UseCaseError(
      `Refund currency mismatch: expected ${payment.currency}, received ${input.amount.currency}`,
      { code: ErrorCode.CURRENCY_MISMATCH },
    );
  }
  return Result.success(input.amount);
}

@Injectable()
export class ProcessRefundUseCase extends UseCase<
  ProcessRefundUseCaseInput,
  IPayment,
  AppError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProvider: PaymentProvider,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(
    input: ProcessRefundUseCaseInput,
  ): Promise<Result<IPayment, AppError>> {
    const { paymentId, reason } = input;

    if (isPositiveAmountMissing(input)) {
      return ErrorFactory.UseCaseError(
        'Refund amount must be greater than zero',
      );
    }

    const paymentResult = await this.paymentRepository.findById(paymentId);
    if (isFailure(paymentResult)) return paymentResult;

    const payment = paymentResult.value;

    if (payment.status === PaymentStatusType.REFUNDED) {
      return Result.success(payment.toPrimitives());
    }

    if (
      !isProcessRefundHttpCommand(input) &&
      isRemainingRefund(input) &&
      payment.remainingAmount <= 0
    ) {
      return Result.success(payment.toPrimitives());
    }

    const moneyResult = resolveRefundMoney(input, payment);
    if (isFailure(moneyResult)) return moneyResult;
    const refundMoney = moneyResult.value;
    const refundMinorUnits = refundMoney.amount;

    if (!payment.providerId.equals(this.paymentProvider.id)) {
      return providerMismatchError(
        payment.provider,
        this.paymentProvider.id.value,
      );
    }

    if (!payment.canBeRefunded()) {
      return ErrorFactory.UseCaseError(
        'Payment cannot be refunded in current status',
      );
    }

    if (refundMinorUnits > payment.remainingAmount) {
      return ErrorFactory.UseCaseError(
        'Refund amount exceeds remaining payment amount',
      );
    }

    if (payment.id === null) {
      return ErrorFactory.UseCaseError('Payment has no ID');
    }

    if (!payment.transactionId) {
      return ErrorFactory.UseCaseError(
        'Cannot refund payment without transaction ID',
      );
    }

    const idempotencyKey = `refund-${payment.id}-${payment.refunds.length}`;

    const providerResult = await this.paymentProvider.refund({
      providerReference: payment.transactionId,
      amount: refundMoney,
      idempotencyKey,
    });
    if (isFailure(providerResult)) return providerResult;

    const refund = Refund.create(
      null,
      payment.id,
      refundMinorUnits,
      payment.currency,
      reason || 'Refund request',
    );

    refund.markAsCompleted();

    const addRefundResult = payment.addRefund(refund);
    if (isFailure(addRefundResult)) return addRefundResult;

    const saveResult = await this.paymentRepository.update(payment);
    if (isFailure(saveResult)) return saveResult;

    this.domainEventPublisher.publish('payment.refunded', {
      paymentId: payment.id,
      refundId: refund.id,
    });

    return Result.success(saveResult.value.toPrimitives());
  }
}
