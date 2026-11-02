import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../../infrastructure/jobs/base-job.handler';
import { ReserveStockForCheckoutUseCase } from '../../../core/application/usecases/reserve-stock-for-checkout/reserve-stock-for-checkout.usecase';
import { Result, isFailure } from '../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ScheduleCheckoutProps } from '../../../core/domain/schedulers/order.scheduler';
import { isValidateCartResult, ValidateCartResult } from '../validate-cart.job';
import { CorrelationService } from '../../../../../infrastructure/logging/correlation/correlation.service';

export interface ReserveStockResult extends ValidateCartResult {
  reservationId: number;
}

export function isReserveStockResult(
  value: unknown,
): value is ReserveStockResult {
  return (
    isValidateCartResult(value) &&
    'reservationId' in value &&
    typeof value.reservationId === 'number'
  );
}

@Injectable()
export class ReserveStockStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ReserveStockResult
> {
  protected readonly logger = new Logger(ReserveStockStep.name);

  constructor(
    private readonly reserveStockUseCase: ReserveStockForCheckoutUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ReserveStockResult, AppError>> {
    const { cartId } = job.data;

    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0];

    if (!isValidateCartResult(childData)) {
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
