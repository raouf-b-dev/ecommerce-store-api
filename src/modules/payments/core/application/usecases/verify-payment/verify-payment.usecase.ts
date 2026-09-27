import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  PAYMENT_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface VerifyPaymentInput {
  paymentId: number;
  callerContext: CallerContext;
}

@Injectable()
export class VerifyPaymentUseCase extends UseCase<
  VerifyPaymentInput,
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    input: VerifyPaymentInput,
  ): Promise<Result<IPayment, UseCaseError>> {
    const { paymentId, callerContext } = input;
    const result = await this.paymentRepository.findById(paymentId);

    if (isFailure(result)) return result;

    const payment = result.value;
    if (!payment) {
      return ErrorFactory.UseCaseError(
        `Payment with id ${paymentId} not found`,
      );
    }

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        payment.userId,
        PAYMENT_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(
        `Payment with id ${paymentId} not found`,
      );
    }

    return Result.success(payment.toPrimitives());
  }
}
