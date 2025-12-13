import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ConfirmReservationUseCase } from '../../../inventory/application/confirm-reservation/confirm-reservation.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ProcessPaymentResult } from './process-payment.job';

export interface ConfirmReservationResult extends ProcessPaymentResult {
  reservationConfirmed: boolean;
}

@Injectable()
export class ConfirmReservationStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ConfirmReservationResult
> {
  protected readonly logger = new Logger(ConfirmReservationStep.name);

  constructor(
    private readonly confirmReservationUseCase: ConfirmReservationUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ConfirmReservationResult, AppError>> {
    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ProcessPaymentResult;

    if (!childData || !childData.reservationId) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from previous step',
      );
    }

    const { reservationId } = childData;
    this.logger.log(`Confirming reservation ${reservationId}...`);

    const result = await this.confirmReservationUseCase.execute(reservationId);

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Reservation ${reservationId} confirmed.`);
    return Result.success({
      ...childData,
      reservationConfirmed: true,
    });
  }
}
