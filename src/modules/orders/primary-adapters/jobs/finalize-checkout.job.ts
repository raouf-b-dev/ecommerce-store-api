import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';
import { ClearCartResult } from './clear-cart.job';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { FinalizeCheckoutUseCase } from '../../core/application/usecases/finalize-checkout/finalize-checkout.usecase';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';

export interface FinalizeCheckoutResult {
  success: boolean;
  orderId: number;
  paymentId: number;
  reservationId: number;
}

@Injectable()
export class FinalizeCheckoutStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  FinalizeCheckoutResult
> {
  protected readonly logger = new Logger(FinalizeCheckoutStep.name);

  constructor(
    private readonly correlation: CorrelationService,
    private readonly finalizeCheckoutUseCase: FinalizeCheckoutUseCase,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<FinalizeCheckoutResult, AppError>> {
    const { flowId } = job.data;

    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ClearCartResult;

    const { orderId, paymentId, reservationId } = childData || {};

    if (!orderId || !paymentId || !reservationId) {
      this.logger.error(
        `Missing required IDs for finalize checkout. Order: ${orderId}, Payment: ${paymentId}, Reservation: ${reservationId}`,
      );
      return ErrorFactory.ServiceError(
        'Missing required IDs for finalize checkout.',
      );
    }

    const finalizeResult = await this.finalizeCheckoutUseCase.execute({
      flowId,
      orderId,
    });

    if (finalizeResult.isFailure) {
      return finalizeResult;
    }

    return Result.success({
      success: true,
      orderId,
      paymentId,
      reservationId,
    });
  }
}
