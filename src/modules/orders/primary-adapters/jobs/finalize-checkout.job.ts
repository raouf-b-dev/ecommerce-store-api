import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { FinalizeCheckoutUseCase } from '../../core/application/usecases/finalize-checkout/finalize-checkout.usecase';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import {
  firstChildValue,
  readNumberProperty,
} from '../../../../infrastructure/jobs/job-child-values';
import { PostPaymentJobData } from './post-payment-job.data';

export interface FinalizeCheckoutResult {
  success: boolean;
  orderId: number;
  paymentId?: number;
  reservationId?: number;
}

@Injectable()
export class FinalizeCheckoutStep extends BaseJobHandler<
  PostPaymentJobData,
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
    job: Job<PostPaymentJobData>,
  ): Promise<Result<FinalizeCheckoutResult, AppError>> {
    const { flowId, orderId, reservationId } = job.data;
    const childrenValues = await job.getChildrenValues<unknown>();
    const childData = firstChildValue(childrenValues);
    const paymentId = readNumberProperty(childData, 'paymentId');

    if (!orderId) {
      this.logger.error('Missing orderId for finalize checkout.');
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
