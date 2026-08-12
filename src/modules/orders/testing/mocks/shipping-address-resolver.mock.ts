import { ShippingAddressProps } from '../../core/domain/value-objects/shipping-address';
import { CheckoutUserInfoResult } from '../../core/application/ports/user.gateway';
import {
  ShippingAddressInput,
  ShippingAddressResolver,
} from '../../core/application/services/shipping-address-resolver';

export class MockShippingAddressResolver implements ShippingAddressResolver {
  resolve = jest.fn<
    ShippingAddressProps | null,
    [ShippingAddressInput | undefined, CheckoutUserInfoResult]
  >();

  resolveFromDto = jest.fn<
    ShippingAddressProps,
    [ShippingAddressInput, CheckoutUserInfoResult]
  >();

  resolveFromDefault = jest.fn<
    ShippingAddressProps | null,
    [CheckoutUserInfoResult]
  >();

  reset(): void {
    this.resolve.mockReset();
    this.resolveFromDto.mockReset();
    this.resolveFromDefault.mockReset();
  }
}
