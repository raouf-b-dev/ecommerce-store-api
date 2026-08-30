export interface InventoryAlertItem {
  productId: number;
  productTitle: string;
  sku: string | null;
  availableQuantity: number;
  lowStockThreshold: number;
}

export interface InventoryAlertsResult {
  items: InventoryAlertItem[];
}
