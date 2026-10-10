import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../infrastructure/jobs/base-job.handler';
import { CreateCheckoutPaymentUseCase } from '../../core/application/usecases/create-checkout-payment/create-checkout-payment.usecase';
import { GetOrderUseCase } from '../../core/application/usecases/get-order/get-order.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { ScheduleCheckoutProps } from '../../core/domain/schedulers/order.scheduler';
import { ReserveStockResult } from './reserve-stock-job/reserve-stock.job';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

export interface ProcessPaymentResult extends ReserveStockResult {
  paymentId: number;
  clientSecret: string;
  orderId: number;
  orderTotal: number;
  orderCurrency: string;
}

function isReserveStockResult(value: unknown): value is ReserveStockResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reservationId' in value &&
    typeof value.reservationId === 'number' &&
    'cartId' in value &&
    typeof value.cartId === 'number' &&
    'cartItems' in value &&
    Array.isArray(value.cartItems)
  );
}

@Injectable()
export class ProcessPaymentStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ProcessPaymentResult
> {
  protected readonly logger = new Logger(ProcessPaymentStep.name);

  constructor(
    private readonly createPaymentUseCase: CreateCheckoutPaymentUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly correlation: CorrelationService,
  ) {
    super();
  }

  protected getCorrelationService(): CorrelationService {
    return this.correlation;
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ProcessPaymentResult, AppError>> {
    const { orderId } = job.data;

    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0];

    if (!isReserveStockResult(childData)) {
      return ErrorFactory.ServiceError(
        'Missing reservation data from ReserveStockStep',
      );
    }

    const { reservationId } = childData;

    const orderResult = await this.getOrderUseCase.execute({
      orderId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(orderResult)) {
      return ErrorFactory.ServiceError(
        `Failed to fetch order ${orderId}: ${orderResult.error.message}`,
      );
    }
    const order = orderResult.value;
    const orderCurrency = order.currency;
    const moneyResult = Money.fromMajorUnits(order.totalPrice, orderCurrency);
    if (isFailure(moneyResult)) {
      return ErrorFactory.ServiceError(
        `Failed to compute payment amount for order ${orderId}: ${moneyResult.error.message}`,
      );
    }
    const orderTotal = moneyResult.value.amount;

    this.logger.log(`Creating payment intent for order ${orderId}...`);

    const paymentResult = await this.createPaymentUseCase.execute({
      orderId,
      amount: orderTotal,
      currency: orderCurrency,
      paymentMethod: order.paymentMethod,
      userId: order.userId,
      metadata: {
        orderId: String(orderId),
        reservationId: String(reservationId),
        cartId: String(job.data.cartId),
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
