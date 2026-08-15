import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { ConfirmCheckoutReservationUseCase } from '../../core/application/usecases/confirm-checkout-reservation/confirm-checkout-reservation.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { isRecord } from '../../../../infrastructure/jobs/job-child-values';
import { PostPaymentJobData } from './post-payment-job.data';

export interface ConfirmReservationResult {
  orderId: number;
  reservationId: number;
  reservationConfirmed: boolean;
}

export function isConfirmReservationResult(
  value: unknown,
): value is ConfirmReservationResult {
  return (
    isRecord(value) &&
    typeof value.orderId === 'number' &&
    typeof value.reservationId === 'number' &&
    typeof value.reservationConfirmed === 'boolean'
  );
}

@Injectable()
export class ConfirmReservationStep extends BaseJobHandler<
  PostPaymentJobData,
  ConfirmReservationResult
> {
  protected readonly logger = new Logger(ConfirmReservationStep.name);

  constructor(
    private readonly confirmReservationUseCase: ConfirmCheckoutReservationUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<PostPaymentJobData>,
  ): Promise<Result<ConfirmReservationResult, AppError>> {
    const { orderId, reservationId } = job.data;

    if (!reservationId) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from previous step',
      );
    }

    this.logger.log(`Confirming reservation ${reservationId}...`);

    const result = await this.confirmReservationUseCase.execute(reservationId);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Reservation ${reservationId} confirmed.`);
    return Result.success({
      orderId,
      reservationId,
      reservationConfirmed: true,
    });
  }
}
