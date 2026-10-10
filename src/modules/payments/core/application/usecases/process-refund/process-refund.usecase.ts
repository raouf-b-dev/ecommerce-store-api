import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Refund } from '../../../domain/entities/refund';
import { PaymentProviderResolver } from '../../ports/payment-provider-resolver';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { ProcessRefundCommand } from '../../commands/process-refund.command';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';

@Injectable()
export class ProcessRefundUseCase extends UseCase<
  ProcessRefundCommand,
  IPayment,
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderResolver: PaymentProviderResolver,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(
    command: ProcessRefundCommand,
  ): Promise<Result<IPayment, UseCaseError>> {
    const { paymentId, amount, reason } = command;

    if (amount <= 0) {
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

    if (!payment.canBeRefunded()) {
      return ErrorFactory.UseCaseError(
        'Payment cannot be refunded in current status',
      );
    }

    if (amount > payment.remainingAmount) {
      return ErrorFactory.UseCaseError(
        'Refund amount exceeds remaining payment amount',
      );
    }

    if (payment.id === null) {
      return ErrorFactory.UseCaseError('Payment has no ID');
    }

    // 1. Get Provider
    const provider = this.paymentProviderResolver.getProvider(
      payment.paymentMethod,
    );

    // 2. Refund via Provider
    if (!payment.transactionId) {
      return ErrorFactory.UseCaseError(
        'Cannot refund payment without transaction ID',
      );
    }

    const moneyResult = Money.create(amount, payment.currency);
    if (isFailure(moneyResult)) {
      return ErrorFactory.UseCaseError(
        `Invalid refund amount: ${moneyResult.error.message}`,
        moneyResult.error,
      );
    }

    const idempotencyKey = `refund-${payment.id}-${payment.refunds.length}`;

    const providerResult = await provider.refund({
      providerReference: payment.transactionId,
      amount: moneyResult.value,
      idempotencyKey,
    });

    if (isFailure(providerResult)) {
      return ErrorFactory.UseCaseError(
        `Gateway refund failed: ${providerResult.error.message}`,
        {
          cause: providerResult.error,
          retryable: providerResult.error.retryable,
        },
      );
    }

    const refund = Refund.create(
      null,
      payment.id,
      amount,
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
