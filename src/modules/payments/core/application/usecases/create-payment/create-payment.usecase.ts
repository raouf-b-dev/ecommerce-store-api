import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { Payment } from '../../../domain/entities/payment';
import { PaymentProvider } from '../../ports/payment-provider';
import {
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { CreatePaymentCommand } from '../../commands/create-payment.command';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';

@Injectable()
export class CreatePaymentUseCase extends UseCase<
  CreatePaymentCommand,
  IPayment,
  AppError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {
    super();
  }

  async execute(
    command: CreatePaymentCommand,
  ): Promise<Result<IPayment, AppError>> {
    const { callerContext } = command;

    if (
      callerContext &&
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        command.userId || null,
        ORDER_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(
        `User ${command.userId} is not allowed to create a payment for order ${command.orderId}`,
      );
    }

    const moneyResult = Money.create(command.amount, command.currency);
    if (isFailure(moneyResult)) return moneyResult;

    const authResult = await this.paymentProvider.authorize(
      moneyResult.value,
      command.paymentMethodDetails
        ? JSON.stringify(command.paymentMethodDetails)
        : undefined,
    );

    if (isFailure(authResult)) return authResult;

    const outcomeResult = authResult.value;

    const payment = Payment.create({
      orderId: command.orderId,
      amount: command.amount,
      currency: command.currency,
      paymentMethod: command.paymentMethod,
      provider: this.paymentProvider.id,
      userId: command.userId ?? null,
      paymentMethodInfo: command.paymentMethodDetails
        ? JSON.stringify(command.paymentMethodDetails)
        : null,
    });

    switch (outcomeResult.outcome) {
      case 'authorized': {
        const authOp = payment.authorize(outcomeResult.providerReference);
        if (isFailure(authOp)) return authOp;
        break;
      }
      case 'captured': {
        const authOp = payment.authorize(outcomeResult.providerReference);
        if (isFailure(authOp)) return authOp;
        const captureOp = payment.capture();
        if (isFailure(captureOp)) return captureOp;
        break;
      }
      case 'failed': {
        const failOp = payment.fail(outcomeResult.failureReason);
        if (isFailure(failOp)) return failOp;
        break;
      }
      default: {
        const _exhaustive: never = outcomeResult;
        return ErrorFactory.UseCaseError(
          `Unhandled authorization outcome: ${JSON.stringify(_exhaustive)}`,
        );
      }
    }

    const saveResult = await this.paymentRepository.save(payment);
    if (isFailure(saveResult)) return saveResult;

    return Result.success(saveResult.value.toPrimitives());
  }
}
