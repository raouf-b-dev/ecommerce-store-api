import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  ShippingAddressResolver,
  ShippingAddressInput,
} from '../../services/shipping-address-resolver';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';
import { CheckoutUserInfoResult } from '../../ports/user.gateway';
import { UserGateway } from '../../ports/user.gateway';
import { CartGateway, CheckoutCartInfo } from '../../ports/cart.gateway';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { isSystemCaller } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface ValidateCheckoutInput {
  cartId: number;
  callerContext: CallerContext | null;
  shippingAddress?: ShippingAddressInput;
}

export interface ValidatedCheckoutContext {
  user: CheckoutUserInfoResult | null;
  cart: CheckoutCartInfo;
  shippingAddress: ShippingAddressProps;
  userId: number;
}

@Injectable()
export class ValidateCheckoutUseCase extends UseCase<
  ValidateCheckoutInput,
  ValidatedCheckoutContext,
  UseCaseError
> {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly cartGateway: CartGateway,
    private readonly addressResolver: ShippingAddressResolver,
  ) {
    super();
  }

  async execute(
    input: ValidateCheckoutInput,
  ): Promise<Result<ValidatedCheckoutContext, UseCaseError>> {
    const { cartId, callerContext, shippingAddress } = input;

    if (!isSystemCaller(callerContext)) {
      if (
        !callerContext ||
        callerContext.userId === null ||
        !callerContext.permissions.has('manage_own_cart')
      ) {
        return ErrorFactory.UseCaseError(
          'Checkout requires a customer account',
        );
      }
    }

    const cartResult = await this.cartGateway.validateCartForCheckout({
      cartId,
      callerContext,
    });
    if (isFailure(cartResult)) {
      return Result.failure(cartResult.error);
    }
    const cart = cartResult.value;

    if (cart.items.length === 0) {
      return ErrorFactory.UseCaseError('Cart is empty');
    }

    const userId = isSystemCaller(callerContext)
      ? cart.userId
      : callerContext.userId;

    const userResult = await this.userGateway.getUserInfo(userId);
    if (isFailure(userResult)) {
      return Result.failure(userResult.error);
    }
    const user = userResult.value;

    const resolvedAddress = this.addressResolver.resolve(shippingAddress, user);

    if (!resolvedAddress) {
      return ErrorFactory.UseCaseError(
        'No default address found. Please provide a shipping address.',
      );
    }

    return Result.success({
      user,
      cart,
      shippingAddress: resolvedAddress,
      userId,
    });
  }
}
