import { Injectable, Logger } from '@nestjs/common';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  InventoryDiscrepancy,
  ReconciliationReport,
} from './reconciliation-report.interface';
import { Inventory } from '../../domain/entities/inventory';

const DEFAULT_RECONCILIATION_BATCH_SIZE = 100;

@Injectable()
export class ReconcileInventoryUseCase {
  private readonly logger = new Logger(ReconcileInventoryUseCase.name);

  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly reservationRepo: ReservationRepository,
  ) {}

  async execute(
    batchSize: number = DEFAULT_RECONCILIATION_BATCH_SIZE,
  ): Promise<Result<ReconciliationReport, AppError>> {
    try {
      const startTime = Date.now();
      const discrepancies: InventoryDiscrepancy[] = [];
      let totalChecked = 0;
      let lastId: number | undefined = undefined;
      const limit = batchSize;
      let hasMore = true;
      const reconciliationAsOfDate = new Date();

      while (hasMore) {
        const batchResult = await this.inventoryRepo.findBatch({
          afterId: lastId,
          limit,
        });

        if (batchResult.isFailure) {
          return ErrorFactory.UseCaseError(
            'Failed to fetch inventory batch for reconciliation',
            batchResult.error,
          );
        }

        const items = batchResult.value;
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        totalChecked += items.length;
        lastId = items[items.length - 1].id!; // Advance cursor to last item's ID

        const productIds = items.map((inv: Inventory) => inv.productId);

        // Fetch active PENDING reservation sums for these products as of batch start
        const pendingSumResult =
          await this.reservationRepo.sumPendingReservedByProductIds(
            productIds,
            reconciliationAsOfDate,
          );

        if (pendingSumResult.isFailure) {
          return ErrorFactory.UseCaseError(
            'Failed to fetch pending reservation totals',
            pendingSumResult.error,
          );
        }

        const pendingMap = pendingSumResult.value;

        for (const item of items) {
          // Reservation drift check: DB reservedQuantity == SUM of active PENDING reservations
          const expectedReserved = pendingMap.get(item.productId) ?? 0;
          if (item.reservedQuantity !== expectedReserved) {
            discrepancies.push({
              productId: item.productId,
              type: 'reservation_drift',
              expected: expectedReserved,
              actual: item.reservedQuantity,
            });
          }
        }

        if (items.length < limit) {
          hasMore = false;
        }
      }

      const durationMs = Date.now() - startTime;

      this.logger.log(
        `Inventory reconciliation complete. Checked: ${totalChecked}, Discrepancies found: ${discrepancies.length}, Duration: ${durationMs}ms`,
      );

      return Result.success({
        totalChecked,
        discrepancyCount: discrepancies.length,
        discrepancies,
        durationMs,
        checkedAt: reconciliationAsOfDate,
      });
    } catch (error) {
      this.logger.error(
        'Unexpected error during inventory reconciliation',
        error,
      );
      return ErrorFactory.UseCaseError(
        'Inventory reconciliation failed',
        error,
      );
    }
  }
}
