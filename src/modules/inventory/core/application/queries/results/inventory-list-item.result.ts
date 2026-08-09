export interface InventoryListItemDTO {
  id: number;
  productId: number;
  sku: string;
  productTitle: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  updatedAt: string;
}

export type InventoryListItemResult = InventoryListItemDTO;
