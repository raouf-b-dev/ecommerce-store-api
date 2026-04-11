import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { InventoryReservationGateway } from '../../ports/inventory-reservation.gateway';

@Injectable()
export class ReleaseCheckoutStockUseCase
  implements UseCase<number, void, UseCaseError>
{
  constructor(private readonly inventoryGateway: InventoryReservationGateway) {}

  async execute(reservationId: number): Promise<Result<void, UseCaseError>> {
    const result = await this.inventoryGateway.releaseStock(reservationId);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to release checkout stock',
        result.error,
      );
    }

    return Result.success(undefined);
  }
}
