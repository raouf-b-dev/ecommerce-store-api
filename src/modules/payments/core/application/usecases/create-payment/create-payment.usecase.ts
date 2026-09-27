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
import { PaymentGatewayResolver } from '../../ports/payment-gateway-resolver';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import {
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { CreatePaymentCommand } from '../../commands/create-payment.command';

@Injectable()
export class CreatePaymentUseCase extends UseCase<
  CreatePaymentCommand,
  IPayment,
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGatewayResolver: PaymentGatewayResolver,
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

    const gateway = this.paymentGatewayResolver.getGateway(
      command.paymentMethod,
    );

    const authResult = await gateway.authorize(
      command.amount,
      command.currency,
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

    const paymentResult = authResult.value;

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

    if (paymentResult.success) {
      if (paymentResult.transactionId) {
        if (paymentResult.status === PaymentStatusType.AUTHORIZED) {
          payment.authorize(paymentResult.transactionId);
        } else if (paymentResult.status === PaymentStatusType.CAPTURED) {
          payment.authorize(paymentResult.transactionId);
          payment.capture();
        } else if (paymentResult.status === PaymentStatusType.COMPLETED) {
          payment.complete(paymentResult.transactionId);
        }
      }
    } else {
      if (paymentResult.errorMessage) {
        payment.fail(paymentResult.errorMessage);
      } else {
        payment.fail('Payment failed at gateway');
      }
    }

    const saveResult = await this.paymentRepository.save(payment);

    if (isFailure(saveResult)) return saveResult;

    return Result.success(saveResult.value.toPrimitives());
  }
}
