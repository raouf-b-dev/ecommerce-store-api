import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Cart } from '../../domain/entities/cart';
import {
  CallerContext,
  isSystemCaller,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { cartNotFoundError } from './cart-not-found';

@Injectable()
export class CartOwnershipValidator {
  validate(
    cart: Cart,
    callerContext: CallerContext | null,
  ): Result<void, UseCaseError> {
    if (isSystemCaller(callerContext)) {
      return Result.success(undefined);
    }

    if (callerContext?.permissions.has('manage_carts')) {
      return Result.success(undefined);
    }

    if (
      !callerContext ||
      !callerContext.permissions.has('manage_own_cart') ||
      callerContext.userId === null ||
      Number(callerContext.userId) !== Number(cart.userId)
    ) {
      return cartNotFoundError(cart.id);
    }

    return Result.success(undefined);
  }
}
