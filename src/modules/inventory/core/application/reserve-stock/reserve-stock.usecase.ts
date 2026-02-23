import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/errors/usecase.error';
import { ReserveStockDto } from '../../../primary-adapters/dto/reserve-stock.dto';
import { UseCase } from '../../../../../shared-kernel/application/use-cases/base.usecase';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { Reservation } from '../../domain/entities/reservation';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../inventory.token';
import { Inject } from '@nestjs/common';

@Injectable()
export class ReserveStockUseCase
  implements UseCase<ReserveStockDto, Reservation, UseCaseError>
{
  constructor(
    @Inject(POSTGRES_RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(
    dto: ReserveStockDto,
  ): Promise<Result<Reservation, UseCaseError>> {
    try {
      const saveResult = await this.reservationRepository.save(dto);

      if (saveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          saveResult.error.message,
          saveResult.error,
        );
      }

      return Result.success(saveResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
