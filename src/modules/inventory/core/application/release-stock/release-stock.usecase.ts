import { Injectable, Inject } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../inventory.token';

@Injectable()
export class ReleaseStockUseCase
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
      const releaseResult = reservation.release();

      if (releaseResult.isFailure) return releaseResult;

      const saveResult = await this.reservationRepository.release(reservation);

      if (saveResult.isFailure) return saveResult;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
