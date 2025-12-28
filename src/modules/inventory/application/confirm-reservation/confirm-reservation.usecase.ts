import { Injectable, Inject } from '@nestjs/common';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../inventory.token';

@Injectable()
export class ConfirmReservationUseCase
  implements UseCase<number, void, UseCaseError>
{
  constructor(
    @Inject(POSTGRES_RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(reservationId: number): Promise<Result<void, UseCaseError>> {
    try {
      const reservationResult =
        await this.reservationRepository.findById(reservationId);
      if (reservationResult.isFailure) return reservationResult;

      const reservation = reservationResult.value;
      const confirmResult = reservation.confirm();

      if (confirmResult.isFailure) return confirmResult;

      const saveResult = await this.reservationRepository.confirm(reservation);

      if (saveResult.isFailure) return saveResult;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
