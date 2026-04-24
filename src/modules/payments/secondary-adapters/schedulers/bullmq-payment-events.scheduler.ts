import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  PaymentCompletedProps,
  PaymentEventsScheduler,
  PaymentFailedProps,
} from '../../core/domain/schedulers/payment-events.scheduler';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

@Injectable()
export class BullMqPaymentEventsScheduler implements PaymentEventsScheduler {
  private readonly logger = new Logger(BullMqPaymentEventsScheduler.name);

  constructor(
    @InjectQueue('payment-events') private readonly paymentEventsQueue: Queue,
    private readonly correlation: CorrelationService,
  ) {}

  async emitPaymentCompleted(
    props: PaymentCompletedProps,
  ): Promise<Result<void, InfrastructureError>> {
    try {
      const correlationId = this.correlation.getId();
      await this.paymentEventsQueue.add(JobNames.PAYMENT_COMPLETED, {
        ...props,
        ...(correlationId ? { correlationId } : {}),
      });
      this.logger.log(
        `Emitted payment completed event for order ${props.orderId}`,
      );
      return Result.success(undefined);
    } catch (error) {
      this.logger.error(
        `Failed to emit payment completed event for order ${props.orderId}`,
        error,
      );
      return ErrorFactory.InfrastructureError(
        'Failed to emit payment completed event',
        error,
      );
    }
  }

  async emitPaymentFailed(
    props: PaymentFailedProps,
  ): Promise<Result<void, InfrastructureError>> {
    try {
      const correlationId = this.correlation.getId();
      await this.paymentEventsQueue.add(JobNames.PAYMENT_FAILED, {
        ...props,
        ...(correlationId ? { correlationId } : {}),
      });
      this.logger.log(
        `Emitted payment failed event for order ${props.orderId}`,
      );
      return Result.success(undefined);
    } catch (error) {
      this.logger.error(
        `Failed to emit payment failed event for order ${props.orderId}`,
        error,
      );
      return ErrorFactory.InfrastructureError(
        'Failed to emit payment failed event',
        error,
      );
    }
  }
}
