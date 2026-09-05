import { ProductListItemDTO } from '../../core/application/queries/results/product-list-item.result';
import { ProductDetailDTO } from '../../core/application/queries/results/product-detail.result';
import { RawProductListQueryRow } from '../../secondary-adapters/dto/raw-product-list-query-row.interface';

export class ProductDtoTestFactory {
  static createRawProductListQueryRow(
    overrides?: Partial<RawProductListQueryRow>,
  ): RawProductListQueryRow {
    return {
      id: 1,
      name: 'Wireless Gaming Mouse',
      slug: 'wireless-gaming-mouse',
      description: 'High precision optical sensor mouse.',
      sku: 'MOUSE-W-001',
      price: '49.99',
      currency: 'USD',
      imageUrl: 'https://example.com/mouse.jpg',
      categoryId: 2,
      categoryName: 'Clothing',
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  static createProductListItemDTO(
    overrides?: Partial<ProductListItemDTO>,
  ): ProductListItemDTO {
    return {
      id: 1,
      name: 'Wireless Gaming Mouse',
      slug: 'wireless-gaming-mouse',
      sku: 'MOUSE-W-001',
      price: 49.99,
      currency: 'USD',
      imageUrl: 'https://example.com/mouse.jpg',
      categoryId: 2,
      categoryName: 'Clothing',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createProductDetailDTO(
    overrides?: Partial<ProductDetailDTO>,
  ): ProductDetailDTO {
    const base = this.createProductListItemDTO(overrides);
    return {
      ...base,
      description: 'High precision optical sensor mouse.',
      updatedAt: base.createdAt,
      ...overrides,
    };
  }
}
