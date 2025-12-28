import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ConfirmOrderUseCase } from '../../application/usecases/confirm-order/confirm-order.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { CreateOrderResult } from './create-order.job';

export interface ConfirmOrderResult extends CreateOrderResult {
  orderConfirmed: boolean;
}

@Injectable()
export class ConfirmOrderStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ConfirmOrderResult
> {
  protected readonly logger = new Logger(ConfirmOrderStep.name);

  constructor(private readonly confirmOrderUseCase: ConfirmOrderUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ConfirmOrderResult, AppError>> {
    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as CreateOrderResult;

    if (!childData || !childData.orderId) {
      return ErrorFactory.ServiceError('Missing order data from previous step');
    }

    const { orderId, reservationId, cartId } =
      childData as CreateOrderResult & {
        reservationId?: number;
        cartId?: number;
      };
    this.logger.log(`Confirming order ${orderId}...`);

    const result = await this.confirmOrderUseCase.execute({
      orderId,
      reservationId,
      cartId: cartId || job.data.cartId,
    });

    if (isFailure(result)) {
      return Result.failure(result.error);
    }

    this.logger.log(`Order ${orderId} confirmed.`);
    return Result.success({
      ...childData,
      orderConfirmed: true,
    });
  }
}
