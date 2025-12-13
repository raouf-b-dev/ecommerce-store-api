import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ClearCartUseCase } from '../../../carts/application/usecases/clear-cart/clear-cart.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ConfirmReservationResult } from './confirm-reservation.job';

export interface ClearCartResult extends ConfirmReservationResult {
  cartCleared: boolean;
}

@Injectable()
export class ClearCartStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ClearCartResult
> {
  protected readonly logger = new Logger(ClearCartStep.name);

  constructor(private readonly clearCartUseCase: ClearCartUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ClearCartResult, AppError>> {
    const { cartId } = job.data;

    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(
      childrenValues,
    )[0] as ConfirmReservationResult;

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
