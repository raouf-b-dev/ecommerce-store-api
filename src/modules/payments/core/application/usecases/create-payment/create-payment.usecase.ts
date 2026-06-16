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
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { Payment } from '../../../domain/entities/payment';
import { PaymentGatewayResolver } from '../../ports/payment-gateway-resolver';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface PaymentMethodDetailsInput {
  token?: string;
  cardLast4?: string;
  cardBrand?: string;
  walletId?: string;
}

export interface CreatePaymentCommand {
  orderId: number;
  amount: number;
  paymentMethod: PaymentMethodType;
  currency: string;
  paymentMethodDetails?: PaymentMethodDetailsInput;
  customerId?: number;
}

export interface CreatePaymentInput {
  command: CreatePaymentCommand;
  callerContext: CallerContext;
}

@Injectable()
export class CreatePaymentUseCase extends UseCase<
  CreatePaymentInput,
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
    input: CreatePaymentInput,
  ): Promise<Result<IPayment, UseCaseError>> {
    const { command: dto, callerContext } = input;

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        dto.customerId || null,
        ORDER_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(
        `User ${dto.customerId} is not allowed to create a payment for order ${dto.orderId}`,
      );
    }

    const gateway = this.paymentGatewayResolver.getGateway(dto.paymentMethod);

    const authResult = await gateway.authorize(
      dto.amount,
      dto.currency,
      dto.paymentMethodDetails
        ? JSON.stringify(dto.paymentMethodDetails)
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
      dto.orderId,
      dto.amount,
      dto.currency,
      dto.paymentMethod,
      dto.customerId,
      dto.paymentMethodDetails
        ? JSON.stringify(dto.paymentMethodDetails)
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
