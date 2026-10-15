import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';
import { GetOrderUseCase } from '../get-order/get-order.usecase';
import { CreatedPayment, PaymentGateway } from '../../ports/payment.gateway';

export interface CreateOrderPaymentCommand {
  orderId: number;
  paymentMethod: PaymentMethodType;
  paymentMethodDetails?: {
    token?: string;
    cardLast4?: string;
    cardBrand?: string;
    walletId?: string;
  };
  callerContext: CallerContext | null;
}

@Injectable()
export class CreateOrderPaymentUseCase extends UseCase<
  CreateOrderPaymentCommand,
  CreatedPayment,
  AppError
> {
  constructor(
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly paymentGateway: PaymentGateway,
  ) {
    super();
  }

  async execute(
    command: CreateOrderPaymentCommand,
  ): Promise<Result<CreatedPayment, AppError>> {
    if (!command.callerContext) {
      return ErrorFactory.UseCaseError(
        `Order with id ${command.orderId} not found`,
      );
    }

    const orderResult = await this.getOrderUseCase.execute({
      orderId: command.orderId,
      callerContext: command.callerContext,
    });
    if (isFailure(orderResult)) return orderResult;

    const order = orderResult.value;
    const moneyResult = Money.fromMajorUnits(order.totalPrice, order.currency);
    if (isFailure(moneyResult)) return moneyResult;

    return this.paymentGateway.createPayment({
      orderId: order.id,
      amount: moneyResult.value.amount,
      currency: moneyResult.value.currency,
      paymentMethod: command.paymentMethod,
      paymentMethodDetails: command.paymentMethodDetails,
      userId: order.userId,
    });
  }
}
