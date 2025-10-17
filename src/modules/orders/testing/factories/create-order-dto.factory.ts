// src/modules/order/testing/factories/create-order-dto.factory.ts

import { PaymentMethod } from '../../domain/value-objects/payment-method';
import { CreateOrderDto } from '../../presentation/dto/create-order.dto';

export class CreateOrderDtoTestFactory {
  /**
   * Creates a valid CreateOrderDto for testing
   */
  static createMockDto(overrides?: Partial<CreateOrderDto>): CreateOrderDto {
    const baseDto: CreateOrderDto = {
      customerInfo: {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
      items: [
        {
          productId: 'PR3',
          quantity: 1,
        },
      ],
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      },
      paymentInfo: {
        method: PaymentMethod.CASH_ON_DELIVERY,
      },
    };

    return { ...baseDto, ...overrides };
  }

  /**
   * Creates DTO with specific payment method
   */
  static createCreditCardDto(
    overrides?: Partial<CreateOrderDto>,
  ): CreateOrderDto {
    return this.createMockDto({
      paymentInfo: {
        method: PaymentMethod.CREDIT_CARD,
      },
      ...overrides,
    });
  }

  static createCashOnDeliveryDto(
    overrides?: Partial<CreateOrderDto>,
  ): CreateOrderDto {
    return this.createMockDto({
      paymentInfo: {
        method: PaymentMethod.CASH_ON_DELIVERY,
      },
      ...overrides,
    });
  }

  /**
   * Creates DTO with multiple items
   */
  static createMultiItemDto(productIds: string[]): CreateOrderDto {
    return this.createMockDto({
      items: productIds.map((productId, index) => ({
        productId,
        quantity: index + 1,
      })),
    });
  }

  /**
   * Creates DTO with customer notes
   */
  static createWithNotesDto(notes: string): CreateOrderDto {
    return this.createMockDto({
      customerNotes: notes,
    });
  }

  /**
   * Creates invalid DTO for negative testing
   */
  static createInvalidDto(): CreateOrderDto {
    return {
      customerInfo: {
        email: 'invalid-email', // Invalid email
        firstName: '',
        lastName: '',
      },
      items: [], // Empty items
      shippingAddress: {
        firstName: '',
        lastName: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      paymentInfo: {
        method: 'INVALID_METHOD' as any,
      },
    };
  }
}
