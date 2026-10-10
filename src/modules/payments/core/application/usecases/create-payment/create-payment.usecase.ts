import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { Payment } from '../../../domain/entities/payment';
import { PaymentProviderResolver } from '../../ports/payment-provider-resolver';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
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
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderResolver: PaymentProviderResolver,
  ) {
    super();
  }

  async execute(
    command: CreatePaymentCommand,
  ): Promise<Result<IPayment, UseCaseError>> {
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

    const provider = this.paymentProviderResolver.getProvider(
      command.paymentMethod,
    );

    const moneyResult = Money.create(command.amount, command.currency);
    if (isFailure(moneyResult)) {
      return ErrorFactory.UseCaseError(
        `Invalid payment amount: ${moneyResult.error.message}`,
        moneyResult.error,
      );
    }

    const authResult = await provider.authorize(
      moneyResult.value,
      command.paymentMethodDetails
        ? JSON.stringify(command.paymentMethodDetails)
        : undefined,
    );

    if (isFailure(authResult)) {
      return ErrorFactory.UseCaseError(
        `Payment authorization failed: ${authResult.error.message}`,
        authResult.error,
      );
    }

    const { providerReference, status } = authResult.value;

    const payment = Payment.create(
      null,
      command.orderId,
      command.amount,
      command.currency,
      command.paymentMethod,
      command.userId,
      command.paymentMethodDetails
        ? JSON.stringify(command.paymentMethodDetails)
        : undefined,
    );

    if (status === PaymentStatusType.AUTHORIZED) {
      payment.authorize(providerReference);
    } else if (status === PaymentStatusType.CAPTURED) {
      payment.authorize(providerReference);
      payment.capture();
    } else if (status === PaymentStatusType.COMPLETED) {
      payment.complete(providerReference);
    }

    const saveResult = await this.paymentRepository.save(payment);

    if (isFailure(saveResult)) return saveResult;

    return Result.success(saveResult.value.toPrimitives());
  }
}
