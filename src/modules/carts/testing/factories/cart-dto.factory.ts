import { CartPresentationDTO } from '../../core/application/queries/results/cart-presentation.result';
import { AddCartItemDto } from '../../primary-adapters/dto/add-cart-item.dto';
import { UpdateCartItemDto } from '../../primary-adapters/dto/update-cart-item.dto';
import { RawCartQueryRow } from '../../secondary-adapters/dto/raw-cart-query-row.interface';

export class CartDtoTestFactory {
  static createAddCartItemDto(
    overrides?: Partial<AddCartItemDto>,
  ): AddCartItemDto {
    return {
      productId: 1,
      quantity: 2,
      ...overrides,
    };
  }

  static createUpdateCartItemDto(
    overrides?: Partial<UpdateCartItemDto>,
  ): UpdateCartItemDto {
    return {
      quantity: 3,
      ...overrides,
    };
  }

  static createRawCartQueryRow(
    overrides?: Partial<RawCartQueryRow>,
  ): RawCartQueryRow {
    return {
      cartId: 1,
      userId: 10,
      cartUpdatedAt: new Date('2024-01-01T00:00:00.000Z'),
      itemId: 100,
      productId: 5,
      productName: 'Mechanical Keyboard',
      price: '89.99',
      quantity: 2,
      imageUrl: 'https://example.com/keyboard.jpg',
      ...overrides,
    };
  }

  static createCartPresentationDTO(
    overrides?: Partial<CartPresentationDTO>,
  ): CartPresentationDTO {
    return {
      id: 1,
      userId: 10,
      items: [
        {
          id: 100,
          productId: 5,
          productName: 'Mechanical Keyboard',
          price: 89.99,
          quantity: 2,
          itemTotal: 179.98,
          imageUrl: 'https://example.com/keyboard.jpg',
        },
      ],
      totalQuantity: 2,
      grandTotal: 179.98,
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }
}
