import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  PaymentCompletedProps,
  PaymentEventsScheduler,
  PaymentFailedProps,
} from '../../domain/schedulers/payment-events.scheduler';
import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { JobNames } from '../../../../core/infrastructure/jobs/job-names';
import { ErrorFactory } from '../../../../core/errors/error.factory';

@Injectable()
export class BullMqPaymentEventsScheduler implements PaymentEventsScheduler {
  private readonly logger = new Logger(BullMqPaymentEventsScheduler.name);

  constructor(
    @InjectQueue('payment-events') private readonly paymentEventsQueue: Queue,
  ) {}

  async emitPaymentCompleted(
    props: PaymentCompletedProps,
  ): Promise<Result<void, InfrastructureError>> {
    try {
      await this.paymentEventsQueue.add(JobNames.PAYMENT_COMPLETED, props);
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
      await this.paymentEventsQueue.add(JobNames.PAYMENT_FAILED, props);
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
