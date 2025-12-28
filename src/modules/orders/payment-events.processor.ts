import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobNames } from '../../core/infrastructure/jobs/job-names';
import { PaymentCompletedStep } from './presentation/jobs/payment-completed.job';
import { PaymentFailedStep } from './presentation/jobs/payment-failed.job';

@Processor('payment-events')
@Injectable()
export class PaymentEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentEventsProcessor.name);

  constructor(
    private readonly paymentCompletedStep: PaymentCompletedStep,
    private readonly paymentFailedStep: PaymentFailedStep,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})...`);

    switch (job.name) {
      case JobNames.PAYMENT_COMPLETED:
        return this.paymentCompletedStep.handle(job);
      case JobNames.PAYMENT_FAILED:
        return this.paymentFailedStep.handle(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
