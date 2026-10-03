import {
  PaymentEventsScheduler,
  PaymentCompletedProps,
  PaymentFailedProps,
} from '../../core/domain/schedulers/payment-events.scheduler';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

export class MockPaymentEventsScheduler implements PaymentEventsScheduler {
  emitPaymentCompleted = jest
    .fn<Promise<Result<void, InfrastructureError>>, [PaymentCompletedProps]>()
    .mockResolvedValue(Result.success(undefined));

  emitPaymentFailed = jest
    .fn<Promise<Result<void, InfrastructureError>>, [PaymentFailedProps]>()
    .mockResolvedValue(Result.success(undefined));

  mockFailedEmitPaymentCompleted(
    message = 'Failed to emit payment completed event',
  ): void {
    this.emitPaymentCompleted.mockResolvedValue(
      ErrorFactory.InfrastructureError(message),
    );
  }

  mockFailedEmitPaymentFailed(
    message = 'Failed to emit payment failed event',
  ): void {
    this.emitPaymentFailed.mockResolvedValue(
      ErrorFactory.InfrastructureError(message),
    );
  }

  reset(): void {
    jest.clearAllMocks();
    this.emitPaymentCompleted.mockResolvedValue(Result.success(undefined));
    this.emitPaymentFailed.mockResolvedValue(Result.success(undefined));
  }
}
