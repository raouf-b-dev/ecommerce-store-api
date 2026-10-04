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
  maxBatches?: number;
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
    const maxBatches = command?.maxBatches;

    let sweptCount = 0;
    const failedIds: number[] = [];
    let batchesProcessed = 0;

    while (true) {
      if (maxBatches !== undefined && batchesProcessed >= maxBatches) {
        break;
      }

      const expiredResult = await this.reservationRepository.findPendingExpired(
        asOfDate,
        batchSize,
        failedIds.length > 0 ? failedIds : undefined,
      );

      if (expiredResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to fetch expired reservations',
          expiredResult.error,
        );
      }

      const reservations = expiredResult.value;
      if (reservations.length === 0) {
        break;
      }

      batchesProcessed++;

      for (const reservation of reservations) {
        const expireDomainResult = reservation.expire();
        if (expireDomainResult.isFailure) {
          this.logger.error(
            `Failed to transition reservation ${reservation.id} to expired: ${expireDomainResult.error.message}`,
          );
          if (reservation.id !== null) {
            failedIds.push(reservation.id);
          }
          continue;
        }

        const saveResult = await this.reservationRepository.expire(reservation);
        if (saveResult.isFailure) {
          this.logger.error(
            `Failed to persist expired reservation ${reservation.id}: ${saveResult.error.message}`,
          );
          if (reservation.id !== null) {
            failedIds.push(reservation.id);
          }
          continue;
        }

        sweptCount++;
      }
    }

    return Result.success({ sweptCount, failedCount: failedIds.length });
  }
}
