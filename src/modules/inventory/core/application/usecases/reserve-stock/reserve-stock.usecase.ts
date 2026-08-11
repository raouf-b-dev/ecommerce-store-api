import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ReserveStockCommand } from '../../commands/reserve-stock.command';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { ReservationRepository } from '../../../domain/repositories/reservation.repository';
import { Reservation } from '../../../domain/entities/reservation';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../../inventory.token';

@Injectable()
export class ReserveStockUseCase implements UseCase<
  ReserveStockCommand,
  Reservation,
  UseCaseError
> {
  constructor(
    @Inject(POSTGRES_RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(
    command: ReserveStockCommand,
  ): Promise<Result<Reservation, UseCaseError>> {
    const saveResult = await this.reservationRepository.save(command);

    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        saveResult.error.message,
        saveResult.error,
      );
    }

    return Result.success(saveResult.value);
  }
}
