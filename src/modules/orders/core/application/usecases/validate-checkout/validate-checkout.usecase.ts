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
import { CheckoutCustomerInfo } from '../../ports/customer.gateway';
import { CustomerGateway } from '../../ports/customer.gateway';
import { CartGateway } from '../../ports/cart.gateway';
import { CheckoutCartInfo } from '../../../domain/interfaces/checkout-cart';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { isSystemCaller } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface ValidateCheckoutInput {
  cartId: number;
  callerContext: CallerContext | null;
  cartToken?: string | null;
  shippingAddress?: ShippingAddressInput;
}

export interface ValidatedCheckoutContext {
  customer: CheckoutCustomerInfo | null;
  cart: CheckoutCartInfo;
  shippingAddress: ShippingAddressProps;
  customerId: number;
}

@Injectable()
export class ValidateCheckoutUseCase extends UseCase<
  ValidateCheckoutInput,
  ValidatedCheckoutContext,
  UseCaseError
> {
  constructor(
    private readonly customerGateway: CustomerGateway,
    private readonly cartGateway: CartGateway,
    private readonly addressResolver: ShippingAddressResolver,
  ) {
    super();
  }

  async execute(
    input: ValidateCheckoutInput,
  ): Promise<Result<ValidatedCheckoutContext, UseCaseError>> {
    const { cartId, callerContext, cartToken, shippingAddress } = input;

    if (!isSystemCaller(callerContext)) {
      if (
        !callerContext ||
        callerContext.customerId === null ||
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
      cartToken: cartToken ?? null,
    });
    if (isFailure(cartResult)) {
      return Result.failure(cartResult.error);
    }
    const cart = cartResult.value;

    if (cart.items.length === 0) {
      return ErrorFactory.UseCaseError('Cart is empty');
    }

    if (isSystemCaller(callerContext)) {
      if (!cart.customerId) {
        return ErrorFactory.UseCaseError(
          'Checkout requires a customer account',
        );
      }

      const customerResult = await this.customerGateway.validateCustomer(
        cart.customerId,
      );
      if (isFailure(customerResult)) {
        return Result.failure(customerResult.error);
      }

      const customer = customerResult.value;
      const resolvedAddress = this.addressResolver.resolve(
        shippingAddress,
        customer,
      );

      if (!resolvedAddress) {
        return ErrorFactory.UseCaseError(
          'No default address found. Please provide a shipping address.',
        );
      }

      return Result.success({
        customer,
        cart,
        shippingAddress: resolvedAddress,
        customerId: cart.customerId,
      });
    }

    const customerId = callerContext.customerId!;

    const customerResult =
      await this.customerGateway.validateCustomer(customerId);
    if (isFailure(customerResult)) {
      return Result.failure(customerResult.error);
    }
    const customer = customerResult.value;

    const resolvedAddress = this.addressResolver.resolve(
      shippingAddress,
      customer,
    );

    if (!resolvedAddress) {
      return ErrorFactory.UseCaseError(
        'No default address found. Please provide a shipping address.',
      );
    }

    return Result.success({
      customer,
      cart,
      shippingAddress: resolvedAddress,
      customerId,
    });
  }
}
