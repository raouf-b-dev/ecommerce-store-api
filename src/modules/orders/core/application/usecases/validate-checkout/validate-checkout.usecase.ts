import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ShippingAddressResolver } from '../../../domain/services/shipping-address-resolver';
import { ShippingAddressDto } from '../../../../primary-adapters/dto/shipping-address.dto';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';
import { CheckoutCustomerInfo } from '../../ports/customer.gateway';
import { CheckoutCartInfo } from '../../ports/cart.gateway';
import { CustomerGateway } from '../../ports/customer.gateway';
import { CartGateway } from '../../ports/cart.gateway';

export interface ValidateCheckoutInput {
  cartId: number;
  userId: number;
  shippingAddress?: ShippingAddressDto;
}

export interface ValidatedCheckoutContext {
  customer: CheckoutCustomerInfo;
  cart: CheckoutCartInfo;
  shippingAddress: ShippingAddressProps;
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
    const { cartId, userId, shippingAddress } = input;

    // 1. Validate Customer exists
    const customerResult = await this.customerGateway.validateCustomer(userId);
    if (isFailure(customerResult)) {
      return Result.failure(customerResult.error);
    }
    const customer = customerResult.value;

    // 2. Validate Cart exists and is not empty
    const cartResult = await this.cartGateway.validateCart(cartId);
    if (isFailure(cartResult)) {
      return Result.failure(cartResult.error);
    }
    const cart = cartResult.value;

    if (cart.items.length === 0) {
      return ErrorFactory.UseCaseError('Cart is empty');
    }

    // 3. Resolve and validate Shipping Address
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
    });
  }
}
