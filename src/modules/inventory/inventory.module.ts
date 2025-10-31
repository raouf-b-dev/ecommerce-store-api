import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { GetInventoryController } from './presentation/controllers/get-inventory/get-inventory.controller';
import { AdjustStockController } from './presentation/controllers/adjust-stock/adjust-stock.controller';
import { ReserveStockController } from './presentation/controllers/reserve-stock/reserve-stock.controller';
import { ReleaseStockController } from './presentation/controllers/release-stock/release-stock.controller';
import { CheckStockController } from './presentation/controllers/check-stock/check-stock.controller';
import { ListLowStockController } from './presentation/controllers/list-low-stock/list-low-stock.controller';
import { BulkCheckStockController } from './presentation/controllers/bulk-check-stock/bulk-check-stock.controller';

@Module({
  controllers: [InventoryController],
  providers: [
    //Controllers
    GetInventoryController,
    AdjustStockController,
    ReserveStockController,
    ReleaseStockController,
    CheckStockController,
    ListLowStockController,
    BulkCheckStockController,
  ],
})
export class InventoryModule {}
