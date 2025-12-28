import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { CreatePaymentIntentUseCase } from '../../../payments/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { GetOrderUseCase } from '../../application/usecases/get-order/get-order.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ReserveStockResult } from './reserve-stock-job/reserve-stock.job';

export interface ProcessPaymentResult extends ReserveStockResult {
  paymentId: number;
  clientSecret: string;
  orderId: number;
  orderTotal: number;
  orderCurrency: string;
}

@Injectable()
export class ProcessPaymentStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ProcessPaymentResult
> {
  protected readonly logger = new Logger(ProcessPaymentStep.name);

  constructor(
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ProcessPaymentResult, AppError>> {
    const { paymentMethod, userId, orderId } = job.data;

    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as ReserveStockResult;

    if (!childData || !childData.reservationId) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from ReserveStockStep',
      );
    }

    const { reservationId } = childData;

    const orderResult = await this.getOrderUseCase.execute(orderId);
    if (isFailure(orderResult)) {
      return ErrorFactory.ServiceError(
        `Failed to fetch order ${orderId}: ${orderResult.error.message}`,
      );
    }
    const order = orderResult.value;
    const orderTotal = order.totalPrice;
    const orderCurrency = order.currency;

    this.logger.log(`Creating payment intent for order ${orderId}...`);

    const paymentResult = await this.createPaymentIntentUseCase.execute({
      orderId,
      amount: orderTotal,
      currency: orderCurrency,
      paymentMethod,
      customerId: userId,
      metadata: {
        orderId,
        reservationId,
      },
    });

    if (isFailure(paymentResult)) {
      return Result.failure(paymentResult.error);
    }

    const { paymentId, clientSecret } = paymentResult.value;
    this.logger.log(`Payment intent created. Payment ID: ${paymentId}`);

    return Result.success({
      ...childData,
      paymentId,
      clientSecret,
      orderId,
      orderTotal,
      orderCurrency,
    });
  }
}
