import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { PaymentGateway } from '../../ports/payment.gateway';
import { RefundPaymentCommand } from '../../commands/refund-payment.command';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

@Injectable()
export class RefundCheckoutPaymentUseCase implements UseCase<
  RefundPaymentCommand,
  void,
  UseCaseError
> {
  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: RefundPaymentCommand,
  ): Promise<Result<void, UseCaseError>> {
    const result = await this.paymentGateway.processRefund(command);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError('Failed to refund checkout payment', {
        cause: result.error,
        retryable: result.error.retryable,
      });
    }

    this.domainEventPublisher.publish('checkout.saga.compensation', {
      step: 'refund-payment',
      paymentId: command.paymentId,
    });

    return Result.success(undefined);
  }
}
