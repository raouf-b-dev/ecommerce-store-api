import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ShippingAddressResolver } from '../../../domain/services/shipping-address-resolver';
import { ShippingAddressDto } from '../../../presentation/dto/shipping-address.dto';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';
import { ICustomer } from '../../../../customers/domain/interfaces/customer.interface';
import { ICart } from '../../../../carts/domain/interfaces/cart.interface';
import { CustomerGateway } from '../../ports/customer.gateway';
import { CartGateway } from '../../ports/cart.gateway';
import { CART_GATEWAY, CUSTOMER_GATEWAY } from '../../../order.token';

export interface ValidateCheckoutInput {
  cartId: number;
  userId: number;
  shippingAddress?: ShippingAddressDto;
}

export interface ValidatedCheckoutContext {
  customer: ICustomer;
  cart: ICart;
  shippingAddress: ShippingAddressProps;
}

@Injectable()
export class ValidateCheckoutUseCase extends UseCase<
  ValidateCheckoutInput,
  ValidatedCheckoutContext,
  UseCaseError
> {
  constructor(
    @Inject(CUSTOMER_GATEWAY) private readonly customerGateway: CustomerGateway,
    @Inject(CART_GATEWAY) private readonly cartGateway: CartGateway,
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
