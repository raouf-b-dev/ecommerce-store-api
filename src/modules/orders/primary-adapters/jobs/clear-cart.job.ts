import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { ClearCheckoutCartUseCase } from '../../core/application/usecases/clear-checkout-cart/clear-checkout-cart.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import {
  ConfirmReservationResult,
  isConfirmReservationResult,
} from './confirm-reservation.job';
import { firstChildValue } from '../../../../infrastructure/jobs/job-child-values';
import { PostPaymentJobData } from './post-payment-job.data';

export interface ClearCartResult extends ConfirmReservationResult {
  cartCleared: boolean;
}

@Injectable()
export class ClearCartStep extends BaseJobHandler<
  PostPaymentJobData,
  ClearCartResult
> {
  protected readonly logger = new Logger(ClearCartStep.name);

  constructor(
    private readonly clearCartUseCase: ClearCheckoutCartUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<PostPaymentJobData>,
  ): Promise<Result<ClearCartResult, AppError>> {
    const { cartId } = job.data;
    const childrenValues = await job.getChildrenValues<unknown>();
    const childData = firstChildValue(childrenValues);

    if (!isConfirmReservationResult(childData)) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from previous step',
      );
    }

    this.logger.log(`Clearing cart ${cartId}...`);

    const result = await this.clearCartUseCase.execute(cartId);

    if (isFailure(result)) {
      this.logger.warn(
        `Failed to clear cart ${cartId}: ${result.error.message}`,
      );
      return Result.success({
        ...childData,
        cartCleared: false,
      });
    }

    this.logger.log(`Cart ${cartId} cleared.`);
    return Result.success({
      ...childData,
      cartCleared: true,
    });
  }
}
