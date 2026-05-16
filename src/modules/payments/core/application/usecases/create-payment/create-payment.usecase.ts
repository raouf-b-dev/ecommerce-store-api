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
    dto: CreatePaymentCommand,
  ): Promise<Result<IPayment, UseCaseError>> {
    // 1. Get Gateway
    const gateway = this.paymentGatewayResolver.getGateway(dto.paymentMethod);

    // 2. Authorize Payment
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

    // 3. Create Payment Entity
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

    // Update status and transaction ID from gateway result
    if (paymentResult.success) {
      if (paymentResult.transactionId) {
        // Map status
        if (paymentResult.status === PaymentStatusType.AUTHORIZED) {
          payment.authorize(paymentResult.transactionId);
        } else if (paymentResult.status === PaymentStatusType.CAPTURED) {
          payment.authorize(paymentResult.transactionId); // Must authorize first if pending
          payment.capture();
        } else if (paymentResult.status === PaymentStatusType.COMPLETED) {
          payment.complete(paymentResult.transactionId);
        } else if (
          paymentResult.status === PaymentStatusType.NOT_REQUIRED_YET
        ) {
          // Do nothing, stays pending or specific status for COD?
          // COD createCOD sets it to NOT_REQUIRED_YET.
          // If we used Payment.create, it's PENDING.
          // We might need to handle COD specifically or just leave it PENDING/AUTHORIZED depending on flow.
          // For COD, gateway returned AUTHORIZED (in my stub).
          // So it will call authorize.
        }
      }
    } else {
      // If gateway failed but didn't throw (e.g. declined), we might want to save as FAILED.
      // But current logic returns failure if authResult is failure.
      // If authResult is success but paymentResult.success is false (soft decline?), we handle it here.
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
