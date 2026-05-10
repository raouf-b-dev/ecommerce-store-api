import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

export interface FinalizeCheckoutInput {
  flowId: string;
  orderId: number;
}

@Injectable()
export class FinalizeCheckoutUseCase
  implements UseCase<FinalizeCheckoutInput, void, UseCaseError>
{
  private readonly logger = new Logger(FinalizeCheckoutUseCase.name);

  constructor(private readonly domainEventPublisher: DomainEventPublisher) {}

  async execute(
    input: FinalizeCheckoutInput,
  ): Promise<Result<void, UseCaseError>> {
    const { flowId, orderId } = input;

    this.logger.log(`Checkout flow ${flowId} completed. Order: ${orderId}`);

    this.domainEventPublisher.publish('checkout.saga.completed', {
      flowId,
      orderId,
    });

    return Result.success(undefined);
  }
}
