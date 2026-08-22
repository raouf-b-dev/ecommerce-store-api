import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { Result } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { MetricsService } from '../../../../infrastructure/metrics/metrics.service';
import { ReconcileInventoryUseCase } from '../../core/application/usecases/reconcile-inventory/reconcile-inventory.usecase';

@Injectable()
export class InventoryReconciliationJob extends BaseJobHandler<void, void> {
  protected readonly logger = new Logger(InventoryReconciliationJob.name);

  constructor(
    private readonly reconcileInventoryUseCase: ReconcileInventoryUseCase,
    private readonly metricsService: MetricsService,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(job: Job<void>): Promise<Result<void, AppError>> {
    this.logger.log(
      `Executing inventory reconciliation job ${job.id ?? 'unknown'}...`,
    );
    const result = await this.reconcileInventoryUseCase.execute();

    if (result.isFailure) {
      return Result.failure(result.error);
    }

    const report = result.value;

    for (const discrepancy of report.discrepancies) {
      this.logger.warn(
        `[INVENTORY DRIFT DETECTED] Product ID ${discrepancy.productId} (${discrepancy.type}): DB reserved (${discrepancy.actual}) != active PENDING reservations sum (${discrepancy.expected})`,
      );
      this.metricsService.inventoryDriftCount.inc({ type: discrepancy.type });
    }

    this.logger.log(
      `Inventory reconciliation finished successfully. Checked: ${report.totalChecked}, Discrepancies logged: ${report.discrepancyCount}, Duration: ${report.durationMs}ms`,
    );

    return Result.success(undefined);
  }
}
