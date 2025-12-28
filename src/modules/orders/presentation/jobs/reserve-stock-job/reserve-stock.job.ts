import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../../core/infrastructure/jobs/base-job.handler';
import { ReserveStockUseCase } from '../../../../inventory/application/reserve-stock/reserve-stock.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { AppError } from '../../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../../domain/schedulers/order.scheduler';
import { ValidateCartResult } from '../validate-cart.job';

export interface ReserveStockResult extends ValidateCartResult {
  reservationId: number;
}

@Injectable()
export class ReserveStockStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ReserveStockResult
> {
  protected readonly logger = new Logger(ReserveStockStep.name);

  constructor(private readonly reserveStockUseCase: ReserveStockUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ReserveStockResult, AppError>> {
    const { cartId } = job.data;

    // Get data from child job (ValidateCartStep)
    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ValidateCartResult;

    if (!childData || !childData.cartItems) {
      return ErrorFactory.ServiceError(
        'Missing cart data from ValidateCartStep',
      );
    }

    this.logger.log(`Reserving stock for cart ${cartId}...`);

    const items = childData.cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const { orderId } = job.data;

    if (!orderId) {
      return ErrorFactory.ServiceError('Order ID is required for reservation');
    }

    const reservationResult = await this.reserveStockUseCase.execute({
      orderId,
      items,
    });

    if (isFailure(reservationResult)) {
      return Result.failure(reservationResult.error);
    }

    const reservation = reservationResult.value;

    if (!reservation.id) {
      return ErrorFactory.ServiceError('Reservation created without ID');
    }

    const reservationId = reservation.id;
    this.logger.log(`Stock reserved. Reservation ID: ${reservationId}`);

    return Result.success({
      ...childData,
      reservationId,
    });
  }
}
