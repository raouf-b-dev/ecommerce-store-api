import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { GetInventoryController } from './presentation/controllers/get-inventory/get-inventory.controller';
import { AdjustStockController } from './presentation/controllers/adjust-stock/adjust-stock.controller';
import { ReserveStockController } from './presentation/controllers/reserve-stock/reserve-stock.controller';
import { ReleaseStockController } from './presentation/controllers/release-stock/release-stock.controller';
import { CheckStockController } from './presentation/controllers/check-stock/check-stock.controller';
import { ListLowStockController } from './presentation/controllers/list-low-stock/list-low-stock.controller';
import { BulkCheckStockController } from './presentation/controllers/bulk-check-stock/bulk-check-stock.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  POSTGRES_INVENTORY_REPOSITORY,
  REDIS_INVENTORY_REPOSITORY,
} from './inventory.token';
import { PostgresInventoryRepository } from './infrastructure/repositories/postgres-inventory-repository/postgres-inventory-repository';
import { RedisInventoryRepository } from './infrastructure/repositories/redis-inventory-repository/redis-inventory-repository';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { InventoryRepository } from './domain/repositories/inventory.repository';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { InventoryEntity } from './infrastructure/orm/inventory.schema';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryEntity]), RedisModule],
  controllers: [InventoryController],
  providers: [
    //Postgres Repo
    {
      provide: POSTGRES_INVENTORY_REPOSITORY,
      useClass: PostgresInventoryRepository,
    },

    // Redis Repo (decorator around Postgres)
    {
      provide: REDIS_INVENTORY_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresInventoryRepository,
      ) => {
        return new RedisInventoryRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_INVENTORY_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: InventoryRepository,
      useExisting: REDIS_INVENTORY_REPOSITORY,
    },

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
