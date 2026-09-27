import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  PAYMENT_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { PaymentQueryService } from '../../ports/payment-query.service';
import { PaymentDetailDTO } from '../../queries/results/payment-detail.result';

export interface GetPaymentInput {
  paymentId: number;
  callerContext: CallerContext;
}

@Injectable()
export class GetPaymentUseCase extends UseCase<
  GetPaymentInput,
  PaymentDetailDTO,
  UseCaseError
> {
  constructor(private readonly paymentQueryService: PaymentQueryService) {
    super();
  }

  async execute(
    input: GetPaymentInput,
  ): Promise<Result<PaymentDetailDTO, UseCaseError>> {
    const { paymentId, callerContext } = input;

    const scope = OwnedResourceAccessPolicy.resolveResourceScope(
      callerContext,
      PAYMENT_ACCESS_PERMISSIONS,
    );

    if (!scope.allowed) {
      return ErrorFactory.UseCaseError(
        `Payment with id ${paymentId} not found`,
      );
    }

    const result = await this.paymentQueryService.getById(
      paymentId,
      scope.authorizedUserId,
    );

    if (isFailure(result) || !result.value) {
      return ErrorFactory.UseCaseError(
        `Payment with id ${paymentId} not found`,
      );
    }

    return Result.success(result.value);
  }
}
