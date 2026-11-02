import { CustomerPiiPolicy } from '../../../../../../shared-kernel/domain/policies/customer-pii.policy';
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  PAYMENT_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { PaymentQueryService } from '../../ports/payment-query.service';
import { PaymentDetailDTO } from '../../queries/results/payment-detail.result';

export interface GetPaymentByOrderIdInput {
  orderId: number;
  callerContext: CallerContext;
}

/**
 * Returns the payment for an order, or `null` when none exists yet
 * (e.g. pending_payment / cancelled before capture). Absence is data, not an error.
 * Unauthorized callers still get a not-found style failure (no existence leak).
 */
@Injectable()
export class GetPaymentByOrderIdUseCase extends UseCase<
  GetPaymentByOrderIdInput,
  PaymentDetailDTO | null,
  UseCaseError
> {
  constructor(private readonly paymentQueryService: PaymentQueryService) {
    super();
  }

  async execute(
    input: GetPaymentByOrderIdInput,
  ): Promise<Result<PaymentDetailDTO | null, UseCaseError>> {
    const { orderId, callerContext } = input;

    const scope = OwnedResourceAccessPolicy.resolveResourceScope(
      callerContext,
      PAYMENT_ACCESS_PERMISSIONS,
    );

    if (!scope.allowed) {
      return ErrorFactory.UseCaseError(
        `Payment for order ID ${orderId} not found`,
        {
          kind: ErrorKind.NOT_FOUND,
          code: ErrorCode.PAYMENT_NOT_FOUND,
        },
      );
    }

    const result = await this.paymentQueryService.getByOrderId(
      orderId,
      scope.authorizedUserId,
    );

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(result.error.message, {
        cause: result.error,
        kind: result.error.kind,
        retryable: result.error.retryable,
      });
    }

    return Result.success(
      result.value && CustomerPiiPolicy.present(result.value, callerContext),
    );
  }
}
