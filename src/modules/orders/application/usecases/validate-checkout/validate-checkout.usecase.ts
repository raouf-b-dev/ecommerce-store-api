import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { GetCustomerUseCase } from '../../../../customers/application/usecases/get-customer/get-customer.usecase';
import { GetCartUseCase } from '../../../../carts/application/usecases/get-cart/get-cart.usecase';
import { ShippingAddressResolver } from '../../../domain/services/shipping-address-resolver';
import { ShippingAddressDto } from '../../../presentation/dto/shipping-address.dto';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';
import { ICustomer } from '../../../../customers/domain/interfaces/customer.interface';
import { ICart } from '../../../../carts/domain/interfaces/cart.interface';

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
    private readonly getCustomerUseCase: GetCustomerUseCase,
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addressResolver: ShippingAddressResolver,
  ) {
    super();
  }

  async execute(
    input: ValidateCheckoutInput,
  ): Promise<Result<ValidatedCheckoutContext, UseCaseError>> {
    const { cartId, userId, shippingAddress } = input;

    // 1. Validate Customer exists
    const customerResult = await this.getCustomerUseCase.execute(userId);
    if (isFailure(customerResult)) {
      return Result.failure(customerResult.error);
    }
    const customer = customerResult.value;

    // 2. Validate Cart exists and is not empty
    const cartResult = await this.getCartUseCase.execute(cartId);
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
