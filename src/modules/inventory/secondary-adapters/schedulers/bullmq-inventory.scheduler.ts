import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobNames } from 'src/infrastructure/jobs/job-names';
import { InventoryScheduler } from '../../core/domain/schedulers/inventory.scheduler';
import { Result } from 'src/shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { ApplicationLifecyclePort } from 'src/shared-kernel/domain/interfaces/application-lifecycle.port';

@Injectable()
export class BullMqInventoryScheduler
  implements InventoryScheduler, OnModuleInit
{
  private readonly logger = new Logger(BullMqInventoryScheduler.name);

  constructor(
    @InjectQueue('inventory')
    private readonly inventoryQueue: Queue,
    private readonly lifecycle: ApplicationLifecyclePort,
  ) {}

  async onModuleInit() {
    await this.scheduleReconciliationJob();
    await this.scheduleSweeperJob();
  }

  async scheduleReconciliationJob(): Promise<
    Result<{ jobId: string }, InfrastructureError>
  > {
    if (this.lifecycle.isShuttingDown) {
      this.logger.debug(
        'Skipping inventory reconciliation schedule during shutdown',
      );
      return ErrorFactory.InfrastructureError(
        'Skipped inventory reconciliation schedule during shutdown',
      );
    }

    const jobName = JobNames.INVENTORY_RECONCILIATION;
    const cron = '0 4 * * *'; // Daily at 4:00 AM
    const jobId = 'inventory-reconciliation-job';

    try {
      await this.inventoryQueue.add(
        jobName,
        {},
        {
          repeat: { pattern: cron },
          jobId,
        },
      );
      this.logger.log(
        'Inventory reconciliation audit job scheduled successfully (cron: 0 4 * * *)',
      );
      return Result.success({ jobId });
    } catch (error) {
      if (this.lifecycle.isShuttingDown) {
        this.logger.debug(
          'Failed to schedule inventory reconciliation audit job (ignored during shutdown)',
        );
      } else {
        this.logger.error(
          'Failed to schedule inventory reconciliation audit job',
          error,
        );
      }
      return ErrorFactory.InfrastructureError(
        'Failed to schedule inventory reconciliation audit job',
        error,
      );
    }
  }

  async scheduleSweeperJob(): Promise<
    Result<{ jobId: string }, InfrastructureError>
  > {
    if (this.lifecycle.isShuttingDown) {
      this.logger.debug(
        'Skipping expired reservations sweeper schedule during shutdown',
      );
      return ErrorFactory.InfrastructureError(
        'Skipped expired reservations sweeper schedule during shutdown',
      );
    }

    const jobName = JobNames.SWEEP_EXPIRED_RESERVATIONS;
    const cron = '*/5 * * * *'; // Every 5 minutes
    const jobId = 'sweep-expired-reservations-job';

    try {
      await this.inventoryQueue.add(
        jobName,
        {},
        {
          repeat: { pattern: cron },
          jobId,
        },
      );
      this.logger.log(
        'Expired reservations sweeper job scheduled successfully (cron: */5 * * * *)',
      );
      return Result.success({ jobId });
    } catch (error) {
      if (this.lifecycle.isShuttingDown) {
        this.logger.debug(
          'Failed to schedule expired reservations sweeper job (ignored during shutdown)',
        );
      } else {
        this.logger.error(
          'Failed to schedule expired reservations sweeper job',
          error,
        );
      }
      return ErrorFactory.InfrastructureError(
        'Failed to schedule expired reservations sweeper job',
        error,
      );
    }
  }
}
