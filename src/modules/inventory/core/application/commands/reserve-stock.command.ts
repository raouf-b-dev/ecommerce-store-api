export interface ReserveStockItem {
  productId: number;
  quantity: number;
}

export interface ReserveStockCommand {
  orderId: number;
  items: ReserveStockItem[];
}
