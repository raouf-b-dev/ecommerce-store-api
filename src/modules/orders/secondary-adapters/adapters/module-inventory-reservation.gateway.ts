import { Injectable } from '@nestjs/common';
import {
  InventoryReservationGateway,
  ReservationData,
  ReserveStockInput,
} from '../../core/application/ports/inventory-reservation.gateway';
import { GetOrderReservationsUseCase } from '../../../inventory/core/application/get-order-reservations/get-order-reservations.usecase';
import { ReserveStockUseCase } from '../../../inventory/core/application/reserve-stock/reserve-stock.usecase';
import { ReleaseStockUseCase } from '../../../inventory/core/application/release-stock/release-stock.usecase';
import { ConfirmReservationUseCase } from '../../../inventory/core/application/confirm-reservation/confirm-reservation.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleInventoryReservationGateway
  implements InventoryReservationGateway
{
  constructor(
    private readonly getOrderReservationsUseCase: GetOrderReservationsUseCase,
    private readonly reserveStockUseCase: ReserveStockUseCase,
    private readonly releaseStockUseCase: ReleaseStockUseCase,
    private readonly confirmReservationUseCase: ConfirmReservationUseCase,
  ) {}

  async getOrderReservations(
    orderId: number,
  ): Promise<Result<ReservationData[], InfrastructureError>> {
    const result = await this.getOrderReservationsUseCase.execute(orderId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to get order reservations',
        result.error,
      );
    }

    const reservationData: ReservationData[] = result.value.map(
      (reservation) => ({
        id: reservation.id,
      }),
    );

    return Result.success(reservationData);
  }

  async reserveStock(
    input: ReserveStockInput,
  ): Promise<Result<ReservationData, InfrastructureError>> {
    const result = await this.reserveStockUseCase.execute({
      orderId: input.orderId,
      items: input.items,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to reserve stock',
        result.error,
      );
    }

    return Result.success({ id: result.value.id });
  }

  async releaseStock(
    reservationId: number,
  ): Promise<Result<void, InfrastructureError>> {
    const result = await this.releaseStockUseCase.execute(reservationId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to release stock',
        result.error,
      );
    }

    return Result.success(undefined);
  }

  async confirmReservation(
    reservationId: number,
  ): Promise<Result<void, InfrastructureError>> {
    const result = await this.confirmReservationUseCase.execute(reservationId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to confirm reservation',
        result.error,
      );
    }

    return Result.success(undefined);
  }
}
