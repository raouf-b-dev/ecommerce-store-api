import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import {
  CheckoutCartItem,
  CheckoutCartInfo,
} from '../../core/application/ports/cart.gateway';
import {
  CheckoutUserAddress,
  CheckoutUserInfoResult,
} from '../../core/application/ports/user.gateway';
import { CheckoutCommand } from '../../core/application/commands/checkout.command';
import { CreateOrderFromCartCommand } from '../../core/application/usecases/create-order-from-cart/create-order-from-cart.usecase';
import { ShippingAddressInput } from '../../core/application/services/shipping-address-resolver';
import { ShippingAddressProps } from '../../core/domain/value-objects/shipping-address';
import { DeliverOrderCommand } from '../../core/application/usecases/deliver-order/deliver-order.usecase';
import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';
import { OrderListItemDTO } from '../../core/application/queries/results/order-list-item.result';
import { OrderDetailDTO } from '../../core/application/queries/results/order-detail.result';
import { OrderItemDetailDTO } from '../../core/application/queries/results/order-item-detail.result';
import { RawOrderListQueryRow } from '../../secondary-adapters/dto/raw-order-list-query-row.interface';
import { CheckoutDto } from '../../primary-adapters/dto/checkout.dto';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';

export class OrderDtoTestFactory {
  static createCheckoutDto(overrides?: Partial<CheckoutDto>): CheckoutDto {
    const { callerContext: _callerContext, ...commandFields } =
      this.createCheckoutCommand();

    const shippingAddress = commandFields.shippingAddress
      ? {
          firstName: commandFields.shippingAddress.firstName ?? 'Test',
          lastName: commandFields.shippingAddress.lastName ?? 'User',
          street: commandFields.shippingAddress.street,
          street2: commandFields.shippingAddress.street2,
          city: commandFields.shippingAddress.city,
          state: commandFields.shippingAddress.state,
          postalCode: commandFields.shippingAddress.postalCode,
          country: commandFields.shippingAddress.country,
          phone: commandFields.shippingAddress.phone,
          deliveryInstructions:
            commandFields.shippingAddress.deliveryInstructions,
        }
      : undefined;

    return {
      cartId: commandFields.cartId,
      paymentMethod: commandFields.paymentMethod,
      customerNotes: commandFields.customerNotes,
      shippingAddress,
      ...overrides,
    };
  }

  static createCheckoutCommand(
    overrides?: Partial<CheckoutCommand>,
  ): CheckoutCommand {
    const baseCommand: CheckoutCommand = {
      cartId: 1,
      paymentMethod: PaymentMethodType.STRIPE,
      shippingAddress: this.createCheckoutShippingAddressInput(),
      callerContext: AuthPayloadFactory.createCallerContext(),
      customerNotes: 'customerNotes',
    };

    return { ...baseCommand, ...overrides };
  }

  static createCheckoutShippingAddressInput(
    overrides?: Partial<ShippingAddressInput>,
  ): ShippingAddressInput {
    const baseInput: ShippingAddressInput = {
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
    };

    return { ...baseInput, ...overrides };
  }

  static createShippingAddressProps(
    overrides?: Partial<ShippingAddressProps>,
  ): ShippingAddressProps {
    const baseProps: ShippingAddressProps = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main St',
      street2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      phone: '555-1234',
      deliveryInstructions: 'Leave at front desk',
    };

    return { ...baseProps, ...overrides };
  }

  static createCreateOrderFromCartInput(
    overrides?: Partial<CreateOrderFromCartCommand>,
  ): CreateOrderFromCartCommand {
    const baseInput: CreateOrderFromCartCommand = {
      cartId: 1,
      userId: 1,
      shippingAddress: this.createShippingAddressProps(),
      paymentMethod: PaymentMethodType.STRIPE,
    };

    return { ...baseInput, ...overrides };
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

  static createOrderItemDetailDTO(
    overrides?: Partial<OrderItemDetailDTO>,
  ): OrderItemDetailDTO {
    const baseItem: OrderItemDetailDTO = {
      productId: 10,
      sku: 'SKU-10',
      title: 'Sample Product',
      unitPrice: 50,
      quantity: 2,
      subtotal: 100,
    };
    return { ...baseItem, ...overrides };
  }

  static createOrderDetailDTO(
    overrides?: Partial<OrderDetailDTO>,
  ): OrderDetailDTO {
    const baseDetail: OrderDetailDTO = {
      id: 1,
      orderNumber: 'ORD-1',
      userId: 2,
      userName: 'John Customer',
      userEmail: 'john@example.com',
      status: 'PENDING_PAYMENT',
      shippingAddress: '123 Main St',
      items: [this.createOrderItemDetailDTO()],
      totalAmount: 100,
      totalPrice: 100,
      currency: 'USD',
      createdAt: new Date('2026-08-09T20:00:00.000Z'),
      updatedAt: new Date('2026-08-09T20:00:00.000Z'),
    };
    return { ...baseDetail, ...overrides };
  }

  static createRawOrderListQueryRow(
    overrides?: Partial<RawOrderListQueryRow>,
  ): RawOrderListQueryRow {
    return {
      id: '42',
      userId: '10',
      userName: 'Alice Smith',
      userEmail: 'alice@example.com',
      status: 'PENDING_PAYMENT',
      itemCount: '3',
      totalAmount: '199.99',
      createdAt: '2026-08-09T20:00:00.000Z',
      ...overrides,
    };
  }

  static createOrderDetailUserInfo(
    overrides?: Partial<{ firstName: string; lastName: string; email: string }>,
  ): { firstName: string; lastName: string; email: string } {
    return {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      ...overrides,
    };
  }

  static createOrderListItemDTO(
    overrides?: Partial<OrderListItemDTO>,
  ): OrderListItemDTO {
    const baseItem: OrderListItemDTO = {
      id: 100,
      orderNumber: 'ORD-100',
      userId: 2,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      status: 'PENDING_PAYMENT',
      itemCount: 2,
      totalAmount: 150,
      currency: 'USD',
      createdAt: new Date('2026-08-09T20:00:00.000Z'),
    };
    return { ...baseItem, ...overrides };
  }
}
