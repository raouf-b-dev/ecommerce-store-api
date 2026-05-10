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
  ProcessRefundInput,
} from '../../ports/payment.gateway';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

@Injectable()
export class RefundCheckoutPaymentUseCase
  implements UseCase<ProcessRefundInput, void, UseCaseError>
{
  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    input: ProcessRefundInput,
  ): Promise<Result<void, UseCaseError>> {
    const result = await this.paymentGateway.processRefund(input);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to refund checkout payment',
        result.error,
      );
    }

    this.domainEventPublisher.publish('checkout.saga.compensation', {
      step: 'refund-payment',
      paymentId: input.paymentId,
    });

    return Result.success(undefined);
  }
}
