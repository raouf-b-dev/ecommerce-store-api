import { Injectable, Inject, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { InventoryReservationGateway } from '../../ports/inventory-reservation.gateway';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { INVENTORY_RESERVATION_GATEWAY } from '../../../../order.token';

@Injectable()
export class ReleaseOrderStockUseCase
  implements UseCase<number, void, UseCaseError>
{
  private readonly logger = new Logger(ReleaseOrderStockUseCase.name);

  constructor(
    @Inject(INVENTORY_RESERVATION_GATEWAY)
    private readonly inventoryReservationGateway: InventoryReservationGateway,
    private readonly orderScheduler: OrderScheduler,
  ) {}

  async execute(orderId: number): Promise<Result<void, UseCaseError>> {
    try {
      this.logger.log(`Finding reservations for order ${orderId}...`);
      const reservationsResult =
        await this.inventoryReservationGateway.getOrderReservations(orderId);

      if (reservationsResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to find reservations for order ${orderId}`,
          reservationsResult.error,
        );
      }

      const reservations = reservationsResult.value;
      this.logger.log(
        `Found ${reservations.length} reservations for order ${orderId}`,
      );

      if (reservations.length === 0) {
        return Result.success(undefined);
      }

      for (const reservation of reservations) {
        if (!reservation.id) continue;

        this.logger.log(
          `Scheduling release-stock job for reservation ${reservation.id}...`,
        );
        const scheduleResult = await this.orderScheduler.scheduleStockRelease(
          reservation.id,
        );

        if (isFailure(scheduleResult)) {
          this.logger.error(
            `Failed to schedule release for reservation ${reservation.id}: ${scheduleResult.error.message}`,
          );
        }
      }

      this.logger.log(
        `Scheduled ${reservations.length} release-stock jobs for order ${orderId}`,
      );
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
