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
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  PAYMENT_ACCESS_PERMISSIONS,
  ORDER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface ListPaymentsQuery {
  orderId?: number;
  userId?: number;
  status?: PaymentStatusType;
  paymentMethod?: PaymentMethodType;
  page?: number;
  limit?: number;
}

export interface ListPaymentsInput {
  query: ListPaymentsQuery;
  callerContext: CallerContext;
}

@Injectable()
export class ListPaymentsUseCase extends UseCase<
  ListPaymentsInput,
  IPayment[],
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    input: ListPaymentsInput,
  ): Promise<Result<IPayment[], UseCaseError>> {
    const { query, callerContext } = input;
    const scope = OwnedResourceAccessPolicy.resolveListScope(
      callerContext,
      PAYMENT_ACCESS_PERMISSIONS,
      query.userId,
    );

    if (!scope.allowed) {
      return Result.success([]);
    }

    if (query.orderId) {
      if (
        !OwnedResourceAccessPolicy.canViewResource(
          callerContext,
          query.userId || null,
          ORDER_ACCESS_PERMISSIONS,
        )
      ) {
        return ErrorFactory.UseCaseError(
          `Order with id ${query.orderId} not found`,
        );
      }

      const result = await this.paymentRepository.findByOrderId(query.orderId);
      if (isFailure(result)) return result;

      return Result.success(result.value.map((p) => p.toPrimitives()));
    }

    if (scope.userId) {
      const result = await this.paymentRepository.findByUserId(
        scope.userId,
        query.page,
        query.limit,
      );
      if (isFailure(result)) return result;
      return Result.success(result.value.map((p) => p.toPrimitives()));
    }

    if (callerContext.permissions.has(PAYMENT_ACCESS_PERMISSIONS.viewAll)) {
      return Result.success([]);
    }

    return Result.success([]);
  }
}
