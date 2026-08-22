import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { InventoryReconciliationJob } from './primary-adapters/jobs/inventory-reconciliation.job';
import { JobNames } from '../../infrastructure/jobs/job-names';

@Processor('inventory', { concurrency: 1 })
export class InventoryProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(InventoryProcessor.name);

  constructor(
    private readonly inventoryReconciliationJob: InventoryReconciliationJob,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Received ${signal}. Closing inventory worker...`);
    await this.worker.close();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JobNames.INVENTORY_RECONCILIATION:
        return this.inventoryReconciliationJob.handle(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Processing inventory job ${job.id} of type ${job.name}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Inventory job ${job.id} of type ${job.name} completed.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Inventory job ${job.id} of type ${job.name} failed: ${err.message}`,
      err.stack,
    );
  }
}
