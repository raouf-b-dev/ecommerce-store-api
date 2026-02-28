// src/modules/order/testing/factories/create-order-dto.factory.ts

import { PaymentMethodType } from '../../../payments/core/domain';
import { CreateOrderDto } from '../../primary-adapters/dto/create-order.dto';
import { DeliverOrderDto } from '../../primary-adapters/dto/deliver-order.dto';

export class CreateOrderDtoTestFactory {
  static createMockDto(overrides?: Partial<CreateOrderDto>): CreateOrderDto {
    const baseDto: CreateOrderDto = {
      customerId: 1,
      items: [
        {
          productId: 3,
          quantity: 1,
        },
      ],
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        street2: undefined,
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
        deliveryInstructions: undefined,
      },
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
    };

    return { ...baseDto, ...overrides };
  }

  static createCreditCardDto(
    overrides?: Partial<CreateOrderDto>,
  ): CreateOrderDto {
    return this.createMockDto({
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      ...overrides,
    });
  }

  static createCashOnDeliveryDto(
    overrides?: Partial<CreateOrderDto>,
  ): CreateOrderDto {
    return this.createMockDto({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      ...overrides,
    });
  }

  static createStripeDto(overrides?: Partial<CreateOrderDto>): CreateOrderDto {
    return this.createMockDto({
      paymentMethod: PaymentMethodType.STRIPE,
      ...overrides,
    });
  }

  static createPayPalDto(overrides?: Partial<CreateOrderDto>): CreateOrderDto {
    return this.createMockDto({
      paymentMethod: PaymentMethodType.PAYPAL,
      ...overrides,
    });
  }

  static createMultiItemDto(productIds: number[]): CreateOrderDto {
    return this.createMockDto({
      items: productIds.map((productId, index) => ({
        productId,
        quantity: index + 1,
      })),
    });
  }

  static createWithNotesDto(notes: string): CreateOrderDto {
    return this.createMockDto({
      customerNotes: notes,
    });
  }

  static createInvalidDto(): CreateOrderDto {
    return {
      customerId: 0,
      items: [],
      shippingAddress: {
        firstName: '',
        lastName: '',
        street: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        deliveryInstructions: '',
      },
      paymentMethod: 'INVALID_METHOD' as any,
    };
  }

  static createDeliverOrderDto(
    overrides?: Partial<DeliverOrderDto>,
  ): DeliverOrderDto {
    const baseDto: DeliverOrderDto = {
      codPayment: {
        transactionId: 'COD-123456',
        notes: 'Cash collected on delivery',
        collectedBy: 'Driver John Doe',
      },
    };

    return { ...baseDto, ...overrides };
  }

  static createDeliverOrderDtoWithFullDetails(
    overrides?: Partial<DeliverOrderDto['codPayment']>,
  ): DeliverOrderDto {
    return {
      codPayment: {
        transactionId: 'COD-789012',
        notes: 'Payment collected successfully',
        collectedBy: 'Delivery Agent Jane Smith',
        ...overrides,
      },
    };
  }

  static createDeliverOrderDtoWithTransactionId(
    transactionId: string,
  ): DeliverOrderDto {
    return {
      codPayment: {
        transactionId,
        notes: 'Payment collected',
        collectedBy: 'Delivery Driver',
      },
    };
  }

  static createDeliverOrderDtoWithNotesOnly(notes: string): DeliverOrderDto {
    return {
      codPayment: {
        notes,
      },
    };
  }

  static createEmptyDeliverOrderDto(): DeliverOrderDto {
    return {};
  }

  static createDeliverOrderDtoWithEmptyCODPayment(): DeliverOrderDto {
    return {
      codPayment: {},
    };
  }
}
