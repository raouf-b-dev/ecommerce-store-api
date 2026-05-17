import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ReservationInput } from '../../domain/repositories/reservation.repository';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { Reservation } from '../../domain/entities/reservation';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../inventory.token';
import { Inject } from '@nestjs/common';

@Injectable()
export class ReserveStockUseCase
  implements UseCase<ReservationInput, Reservation, UseCaseError>
{
  constructor(
    @Inject(POSTGRES_RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(
    input: ReservationInput,
  ): Promise<Result<Reservation, UseCaseError>> {
    const saveResult = await this.reservationRepository.save(input);

    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        saveResult.error.message,
        saveResult.error,
      );
    }

    return Result.success(saveResult.value);
  }
}
