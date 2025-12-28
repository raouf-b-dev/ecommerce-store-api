import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { GetOrderUseCase } from '../../application/usecases/get-order/get-order.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ReserveStockResult } from './reserve-stock-job/reserve-stock.job';

export interface CreateOrderResult extends ReserveStockResult {
  orderId: number;
  orderTotal: number;
  orderCurrency: string;
}

@Injectable()
export class CreateOrderStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  CreateOrderResult
> {
  protected readonly logger = new Logger(CreateOrderStep.name);

  constructor(private readonly getOrderUseCase: GetOrderUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<CreateOrderResult, AppError>> {
    const { orderId } = job.data;

    // Get data from child job (ReserveStockStep)
    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ReserveStockResult;

    if (!childData || !childData.reservationId) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from ReserveStockStep',
      );
    }

    // Orders are now always created in CheckoutUseCase
    // This step only fetches the existing order
    if (!orderId) {
      return ErrorFactory.ServiceError(
        'Order ID is required. Orders must be created via CheckoutUseCase.',
      );
    }

    this.logger.log(`Fetching order ${orderId}...`);
    const orderResult = await this.getOrderUseCase.execute(orderId);

    if (isFailure(orderResult)) {
      return ErrorFactory.ServiceError(
        `Order ${orderId} not found: ${orderResult.error.message}`,
      );
    }

    const order = orderResult.value;
    this.logger.log(`Order ${order.id} fetched successfully`);

    return Result.success({
      ...childData,
      orderId: order.id!,
      orderTotal: order.totalPrice,
      orderCurrency: 'USD',
    });
  }
}
