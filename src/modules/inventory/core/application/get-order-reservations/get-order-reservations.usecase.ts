import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { Reservation } from '../../domain/entities/reservation';

@Injectable()
export class GetOrderReservationsUseCase
  implements UseCase<number, Reservation[], UseCaseError>
{
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(orderId: number): Promise<Result<Reservation[], UseCaseError>> {
    try {
      const result = await this.reservationRepository.findAllByOrderId(orderId);
      if (result.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to fetch reservations',
          result.error,
        );
      }
      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected error', error);
    }
  }
}
