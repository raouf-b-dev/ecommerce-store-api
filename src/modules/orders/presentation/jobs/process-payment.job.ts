import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { CreatePaymentIntentUseCase } from '../../../payments/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { CreateOrderResult } from './create-order.job';

export interface ProcessPaymentResult extends CreateOrderResult {
  paymentId: number;
  clientSecret: string;
}

@Injectable()
export class ProcessPaymentStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ProcessPaymentResult
> {
  protected readonly logger = new Logger(ProcessPaymentStep.name);

  constructor(
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ProcessPaymentResult, AppError>> {
    const { paymentMethod, userId } = job.data;

    // Get data from child job (CreateOrderStep)
    const childrenValues = await job.getChildrenValues();
    const childData = Object.values(childrenValues)[0] as CreateOrderResult;

    if (!childData || !childData.orderId) {
      return ErrorFactory.ServiceError(
        'Missing order data from CreateOrderStep',
      );
    }

    const { orderId, orderTotal, orderCurrency, reservationId } = childData;
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
    });
  }
}
