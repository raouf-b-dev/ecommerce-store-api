import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import {
  CheckoutCartItem,
  CheckoutCartInfo,
} from '../../core/application/ports/cart.gateway';
import {
  CheckoutUserAddress,
  CheckoutUserInfoResult,
} from '../../core/application/ports/user.gateway';
import { CheckoutCommand } from '../../core/application/usecases/checkout/checkout.usecase';
import { DeliverOrderCommand } from '../../core/application/usecases/deliver-order/deliver-order.usecase';
import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';

export class OrderDtoTestFactory {
  static createCheckoutCommand(
    overrides?: Partial<CheckoutCommand>,
  ): CheckoutCommand {
    const baseCommand: CheckoutCommand = {
      cartId: 1,
      paymentMethod: PaymentMethodType.STRIPE,
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      },
    };

    return { ...baseCommand, ...overrides };
  }

  static createDeliverOrderCommand(
    overrides?: Partial<DeliverOrderCommand>,
  ): DeliverOrderCommand {
    const baseCommand: DeliverOrderCommand = {
      notes: 'Delivered successfully',
    };

    return { ...baseCommand, ...overrides };
  }

  static createCheckoutUserAddress(
    overrides?: Partial<CheckoutUserAddress>,
  ): CheckoutUserAddress {
    const baseUser: CheckoutUserAddress = {
      id: 1,
      street: 'street',
      street2: null,
      city: 'city',
      state: 'state',
      postalCode: 'postalCode',
      country: 'country',
      isDefault: false,
      deliveryInstructions: null,
      type: AddressType.HOME,
    };
    return { ...baseUser, ...overrides };
  }

  static createCheckoutUserInfoResult(
    overrides?: Partial<CheckoutUserInfoResult>,
  ): CheckoutUserInfoResult {
    const addresses = [this.createCheckoutUserAddress()];
    const baseUser: CheckoutUserInfoResult = {
      id: 1,
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      phone: 'phone',
      addresses: addresses,
    };
    return { ...baseUser, ...overrides };
  }

  static createCheckoutCartItem(
    overrides?: Partial<CheckoutCartItem>,
  ): CheckoutCartItem {
    const baseUser: CheckoutCartItem = {
      productId: 1,
      productName: 'productName',
      price: 10,
      quantity: 1,
    };
    return { ...baseUser, ...overrides };
  }

  static createCheckoutCartInfo(
    overrides?: Partial<CheckoutCartInfo>,
  ): CheckoutCartInfo {
    const items = [this.createCheckoutCartItem()];
    const baseUser: CheckoutCartInfo = {
      id: 1,
      userId: 1,
      items: items,
    };
    return { ...baseUser, ...overrides };
  }
}
