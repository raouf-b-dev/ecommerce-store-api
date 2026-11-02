import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  CallerContext,
  isSystemCaller,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  ORDER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Order } from '../../domain/entities/order';
import { orderCannotBeCancelledError } from '../../domain/errors/order-cannot-be-cancelled.error';
import { orderNotFoundError } from './order-not-found';

/**
 * Ownership via OwnedResourceAccessPolicy, plus one order-only rule:
 * a caller without manage_orders cannot cancel once fulfilment has started.
 * System callers and manage_orders callers skip that state rule.
 */
export class CancelOrderAccessPolicy {
  static authorize(
    callerContext: CallerContext,
    order: Order,
    orderId: number,
  ): Result<void, UseCaseError | DomainError> {
    if (
      !OwnedResourceAccessPolicy.canMutateResource(
        callerContext,
        order.userId,
        ORDER_MUTATION_PERMISSIONS,
      )
    ) {
      return orderNotFoundError(orderId);
    }

    if (
      isSystemCaller(callerContext) ||
      callerContext.permissions.has(ORDER_MUTATION_PERMISSIONS.manageAll)
    ) {
      return Result.success(undefined);
    }

    if (order.isFulfilmentStarted()) {
      return orderCannotBeCancelledError();
    }

    return Result.success(undefined);
  }
}
