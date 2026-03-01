import { Injectable } from '@nestjs/common';
import {
  InventoryReservationGateway,
  ReservationData,
} from '../../core/application/ports/inventory-reservation.gateway';
import { GetOrderReservationsUseCase } from '../../../inventory/core/application/get-order-reservations/get-order-reservations.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleInventoryReservationGateway
  implements InventoryReservationGateway
{
  constructor(
    private readonly getOrderReservationsUseCase: GetOrderReservationsUseCase,
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
}
