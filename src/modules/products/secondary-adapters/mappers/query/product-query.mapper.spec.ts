import { ProductDtoTestFactory } from 'src/modules/products/testing';
import { ProductQueryMapper } from './product-query.mapper';

describe('ProductQueryMapper', () => {
  it('should correctly map raw row to ProductListItemDTO and ProductDetailDTO', () => {
    const rawRow = ProductDtoTestFactory.createRawProductListQueryRow();

    const listItem = ProductQueryMapper.toListItemDto(rawRow);
    const detail = ProductQueryMapper.toDetailDto(rawRow);

    expect(listItem).toEqual({
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
    });

    expect(detail).toEqual({
      ...listItem,
      description: 'High precision optical sensor mouse.',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });
});
