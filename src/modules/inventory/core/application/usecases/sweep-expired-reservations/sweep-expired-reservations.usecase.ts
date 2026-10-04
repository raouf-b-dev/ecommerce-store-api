import { Injectable, Inject, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ReservationRepository } from '../../../domain/repositories/reservation.repository';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../../inventory.token';

export interface SweepExpiredReservationsCommand {
  asOfDate?: Date;
  batchSize?: number;
}

export interface SweepExpiredReservationsResult {
  sweptCount: number;
  failedCount: number;
}

@Injectable()
export class SweepExpiredReservationsUseCase implements UseCase<
  SweepExpiredReservationsCommand | undefined,
  SweepExpiredReservationsResult,
  UseCaseError
> {
  private readonly logger = new Logger(SweepExpiredReservationsUseCase.name);
  private static readonly DEFAULT_BATCH_SIZE = 100;

  constructor(
    @Inject(POSTGRES_RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(
    command?: SweepExpiredReservationsCommand,
  ): Promise<Result<SweepExpiredReservationsResult, UseCaseError>> {
    const asOfDate = command?.asOfDate ?? new Date();
    const batchSize =
      command?.batchSize ?? SweepExpiredReservationsUseCase.DEFAULT_BATCH_SIZE;

    const expiredResult = await this.reservationRepository.findPendingExpired(
      asOfDate,
      batchSize,
    );

    if (expiredResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to fetch expired reservations',
        expiredResult.error,
      );
    }

    const reservations = expiredResult.value;
    let sweptCount = 0;
    let failedCount = 0;

    for (const reservation of reservations) {
      const expireDomainResult = reservation.expire();
      if (expireDomainResult.isFailure) {
        this.logger.error(
          `Failed to transition reservation ${reservation.id} to expired: ${expireDomainResult.error.message}`,
        );
        failedCount++;
        continue;
      }

      const saveResult = await this.reservationRepository.expire(reservation);
      if (saveResult.isFailure) {
        this.logger.error(
          `Failed to persist expired reservation ${reservation.id}: ${saveResult.error.message}`,
        );
        failedCount++;
        continue;
      }

      sweptCount++;
    }

    return Result.success({ sweptCount, failedCount });
  }
}
