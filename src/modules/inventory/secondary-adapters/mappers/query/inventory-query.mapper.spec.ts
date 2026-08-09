import { InventoryQueryMapper } from './inventory-query.mapper';
import { InventoryDtoTestFactory } from '../../../testing/factories/inventory-dto.factory';

describe('InventoryQueryMapper', () => {
  it('should correctly map a raw inventory row to InventoryListItemDTO', () => {
    const rawRow = InventoryDtoTestFactory.createRawInventoryListQueryRow();

    const result = InventoryQueryMapper.toListItemDto(rawRow);

    expect(result).toEqual({
      id: 10,
      productId: 5,
      sku: 'PROD-SKU-100',
      productTitle: 'Wireless Headphones',
      availableQuantity: 45,
      reservedQuantity: 5,
      totalQuantity: 50,
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('should supply default fallback values when nullable fields are missing', () => {
    const rawRow = InventoryDtoTestFactory.createRawInventoryListQueryRow({
      id: '12',
      productId: '8',
      sku: null,
      productTitle: null,
      availableQuantity: '10',
      reservedQuantity: '0',
      totalQuantity: '10',
      updatedAt: '2024-02-01T12:00:00.000Z',
    });

    const result = InventoryQueryMapper.toListItemDto(rawRow);

    expect(result).toEqual({
      id: 12,
      productId: 8,
      sku: 'N/A',
      productTitle: 'Unknown Product',
      availableQuantity: 10,
      reservedQuantity: 0,
      totalQuantity: 10,
      updatedAt: '2024-02-01T12:00:00.000Z',
    });
  });
});
