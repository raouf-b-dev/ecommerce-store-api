import { InventoryListItemDTO } from '../../core/application/queries/results/inventory-list-item.result';
import { RawInventoryListQueryRow } from '../../secondary-adapters/dto/raw-inventory-list-query-row.interface';

export class InventoryDtoTestFactory {
  static createRawInventoryListQueryRow(
    overrides?: Partial<RawInventoryListQueryRow>,
  ): RawInventoryListQueryRow {
    return {
      id: 10,
      productId: 5,
      sku: 'PROD-SKU-100',
      productTitle: 'Wireless Headphones',
      availableQuantity: 45,
      reservedQuantity: 5,
      totalQuantity: 50,
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  static createInventoryListItemDTO(
    overrides?: Partial<InventoryListItemDTO>,
  ): InventoryListItemDTO {
    return {
      id: 1,
      productId: 100,
      sku: 'SKU-TEST-100',
      productTitle: 'Test Product Title',
      availableQuantity: 50,
      reservedQuantity: 5,
      totalQuantity: 55,
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }
}
