import { Injectable } from '@nestjs/common';
import {
  InventoryReservationGateway,
  ReservationData,
  ReserveStockItem,
} from '../../ports/inventory-reservation.gateway';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';

export interface ReserveStockForCheckoutInput {
  orderId: number;
  items: ReserveStockItem[];
}

@Injectable()
export class ReserveStockForCheckoutUseCase
  implements
    UseCase<ReserveStockForCheckoutInput, ReservationData, UseCaseError>
{
  constructor(private readonly inventoryGateway: InventoryReservationGateway) {}

  async execute(
    input: ReserveStockForCheckoutInput,
  ): Promise<Result<ReservationData, UseCaseError>> {
    const result = await this.inventoryGateway.reserveStock({
      orderId: input.orderId,
      items: input.items,
    });

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to reserve stock for checkout',
        result.error,
      );
    }

    return Result.success(result.value);
  }
}
