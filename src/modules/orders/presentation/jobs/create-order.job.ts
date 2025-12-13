import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { CreateOrderFromCartUseCase } from '../../application/usecases/create-order-from-cart/create-order-from-cart.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ReserveStockResult } from './reserve-stock.job';

export interface CreateOrderResult extends ReserveStockResult {
  orderId: string;
  orderTotal: number;
  orderCurrency: string;
}

@Injectable()
export class CreateOrderStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  CreateOrderResult
> {
  protected readonly logger = new Logger(CreateOrderStep.name);

  constructor(
    private readonly createOrderFromCartUseCase: CreateOrderFromCartUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<CreateOrderResult, AppError>> {
    const { cartId, userId, paymentMethod, shippingAddress } = job.data;

    // Get data from child job (ReserveStockStep)
    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ReserveStockResult;

    if (!childData || !childData.reservationId) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from ReserveStockStep',
      );
    }

    this.logger.log(`Creating order for cart ${cartId}...`);

    const orderResult = await this.createOrderFromCartUseCase.execute({
      cartId,
      userId,
      paymentMethod,
      shippingAddress,
    });

    if (isFailure(orderResult)) {
      return Result.failure(orderResult.error);
    }

    const order = orderResult.value;
    this.logger.log(`Order created. Order ID: ${order.id}`);

    return Result.success({
      ...childData,
      orderId: order.id,
      orderTotal: order.totalPrice,
      orderCurrency: 'USD',
    });
  }
}
