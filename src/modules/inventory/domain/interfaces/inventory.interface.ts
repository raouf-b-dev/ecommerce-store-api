// src/modules/inventory/domain/interfaces/inventory.interface.ts
export interface IInventory {
  id: number | null;
  productId: number;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
  lastRestockDate: Date | null;
}
