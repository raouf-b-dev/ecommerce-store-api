import { StockAdjustmentType } from '../../domain/value-objects/stock-adjustment-type';

export interface AdjustStockCommand {
  productId: number;
  quantity: number;
  type: StockAdjustmentType;
  reason?: string;
}
