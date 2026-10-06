export interface RawInventoryListQueryRow {
  id: number;
  productId: number;
  sku: string | null;
  productTitle: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  updatedAt: Date | string;
}
