import { ProductData } from '../../core/application/ports/product.gateway';

export class CartGatewayDtoFactory {
  static createProductData(overrides?: Partial<ProductData>): ProductData {
    const baseProduct: ProductData = {
      id: 1,
      name: 'Test Product',
      price: 29.99,
    };

    return { ...baseProduct, ...overrides };
  }
}
