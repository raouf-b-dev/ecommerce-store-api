import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ReservationRepository } from '../../../domain/repositories/reservation.repository';

@Injectable()
export class ConfirmReservationUseCase implements UseCase<
  number,
  void,
  UseCaseError
> {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(reservationId: number): Promise<Result<void, UseCaseError>> {
    const reservationResult =
      await this.reservationRepository.findById(reservationId);
    if (reservationResult.isFailure) return reservationResult;

    const reservation = reservationResult.value;
    const confirmResult = reservation.confirm();

    if (confirmResult.isFailure) return confirmResult;

    const saveResult = await this.reservationRepository.confirm(reservation);

    if (saveResult.isFailure) return saveResult;

    return Result.success(undefined);
  }
}
