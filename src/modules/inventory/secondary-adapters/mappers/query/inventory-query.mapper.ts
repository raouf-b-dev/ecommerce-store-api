import { InventoryListItemDTO } from '../../../core/application/queries/results/inventory-list-item.result';
import { RawInventoryListQueryRow } from '../../dto/raw-inventory-list-query-row.interface';

export class InventoryQueryMapper {
  static toListItemDto(row: RawInventoryListQueryRow): InventoryListItemDTO {
    const available = Number(row.availableQuantity || 0);
    const reserved = Number(row.reservedQuantity || 0);
    const total = Number(row.totalQuantity || available + reserved);

    return {
      id: Number(row.id),
      productId: Number(row.productId),
      sku: row.sku || 'N/A',
      productTitle: row.productTitle || 'Unknown Product',
      availableQuantity: available,
      reservedQuantity: reserved,
      totalQuantity: total,
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt),
    };
  }
}
