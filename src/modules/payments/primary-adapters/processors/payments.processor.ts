// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { SimulateMockPaymentWebhookJob } from '../jobs/simulate-mock-payment-webhook.job';

@Processor('payments')
@Injectable()
export class PaymentsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(
    private readonly simulateMockPaymentWebhookJob: SimulateMockPaymentWebhookJob,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Received ${signal}. Closing payments worker...`);
    await this.worker.close();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})...`);

    switch (job.name) {
      case JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK:
        return this.simulateMockPaymentWebhookJob.handle(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
