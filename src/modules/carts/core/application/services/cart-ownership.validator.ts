import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Cart } from '../../domain/entities/cart';
import {
  CallerContext,
  isSystemCaller,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartSessionTokenService } from '../../../../auth/core/application/services/cart-session-token.service';

@Injectable()
export class CartOwnershipValidator {
  constructor(
    private readonly cartSessionTokenService: CartSessionTokenService,
  ) {}

  async validate(
    cart: Cart,
    callerContext: CallerContext | null,
    cartToken: string | null,
  ): Promise<Result<void, UseCaseError>> {
    if (isSystemCaller(callerContext)) {
      return Result.success(undefined);
    }

    // Admin bypass: allow if the caller has manage_carts permission
    if (callerContext?.permissions.has('manage_carts')) {
      return Result.success(undefined);
    }

    // User cart -> match customerId and verify caller has manage_own_cart permission
    if (cart.isUserCart()) {
      if (
        !callerContext ||
        !callerContext.permissions.has('manage_own_cart') ||
        callerContext.customerId === null ||
        Number(callerContext.customerId) !== Number(cart.customerId)
      ) {
        return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
      }
      return Result.success(undefined);
    }

    // Guest cart -> validate session token (works for anonymous and logged-in clients)
    if (cart.isGuestCart()) {
      if (
        !cartToken ||
        !(await this.cartSessionTokenService.validateToken(cartToken, cart.id!))
      ) {
        return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
      }
      return Result.success(undefined);
    }

    return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
  }
}
