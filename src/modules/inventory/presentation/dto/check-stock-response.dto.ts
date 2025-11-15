export interface CheckStockResponse {
  isAvailable: boolean;
  availableQuantity: number;
  requestedQuantity: number;
}
