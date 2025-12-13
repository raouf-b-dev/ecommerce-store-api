import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { Result } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ClearCartResult } from './clear-cart.job';

export interface FinalizeCheckoutResult {
  success: boolean;
  orderId: string;
  paymentId: string;
  reservationId: string;
}

@Injectable()
export class FinalizeCheckoutStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  FinalizeCheckoutResult
> {
  protected readonly logger = new Logger(FinalizeCheckoutStep.name);

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<FinalizeCheckoutResult, AppError>> {
    const { flowId } = job.data as any;

    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ClearCartResult;

    const { orderId, paymentId, reservationId } = childData || {};

    this.logger.log(
      `Checkout flow ${flowId} completed. Order: ${orderId}, Payment: ${paymentId}`,
    );

    return Result.success({
      success: true,
      orderId: orderId || 'unknown',
      paymentId: paymentId || 'unknown',
      reservationId: reservationId || 'unknown',
    });
  }
}
