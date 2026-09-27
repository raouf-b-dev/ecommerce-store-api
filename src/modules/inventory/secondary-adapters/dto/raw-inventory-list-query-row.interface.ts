export interface RawInventoryListQueryRow {
  id: number | string;
  productId: number | string;
  sku: string | null;
  productTitle: string | null;
  availableQuantity: number | string;
  reservedQuantity: number | string;
  totalQuantity: number | string;
  updatedAt: Date | string;
}
