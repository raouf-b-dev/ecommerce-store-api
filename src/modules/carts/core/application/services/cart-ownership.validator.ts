import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Cart } from '../../domain/entities/cart';
import {
  CallerContext,
  isSystemCaller,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartSessionTokenGateway } from '../ports/session-token.gateway';

@Injectable()
export class CartOwnershipValidator {
  constructor(private readonly sessionTokenGateway: CartSessionTokenGateway) {}

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

    // User cart -> match userId and verify caller has manage_own_cart permission
    if (cart.isUserCart()) {
      if (
        !callerContext ||
        !callerContext.permissions.has('manage_own_cart') ||
        callerContext.userId === null ||
        Number(callerContext.userId) !== Number(cart.userId)
      ) {
        return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
      }
      return Result.success(undefined);
    }

    // Guest cart -> validate session token (works for anonymous and logged-in clients)
    if (cart.isGuestCart()) {
      if (!cartToken) {
        return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
      }
      const tokenResult = await this.sessionTokenGateway.validateToken(
        cartToken,
        cart.id!,
      );
      if (tokenResult.isFailure || !tokenResult.value) {
        return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
      }
      return Result.success(undefined);
    }

    return ErrorFactory.UseCaseError(`Cart with id ${cart.id} not found`);
  }
}
