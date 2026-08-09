import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module';
import {
  POSTGRES_INVENTORY_REPOSITORY,
  CACHED_INVENTORY_REPOSITORY,
} from './inventory.token';
import { PostgresInventoryRepository } from './secondary-adapters/repositories/postgres-inventory-repository/postgres-inventory-repository';
import { CachedInventoryRepository } from './secondary-adapters/repositories/cached-inventory-repository/cached-inventory-repository';
import { CachePort } from '../../infrastructure/redis/cache/cache.port';
import { InventoryRepository } from './core/domain/repositories/inventory.repository';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { InventoryEntity } from './secondary-adapters/orm/inventory.schema';
import { AdjustStockUseCase } from './core/application/adjust-stock/adjust-stock.usecase';
import { GetInventoryUseCase } from './core/application/get-inventory/get-inventory.usecase';
import { ReserveStockUseCase } from './core/application/reserve-stock/reserve-stock.usecase';
import { BulkCheckStockUseCase } from './core/application/bulk-check-stock/bulk-check-stock.usecase';
import { CheckStockUseCase } from './core/application/check-stock/check-stock.usecase';
import { ListLowStockUseCase } from './core/application/list-low-stock/list-low-stock.usecase';
import { ReleaseStockUseCase } from './core/application/release-stock/release-stock.usecase';
import { ConfirmReservationUseCase } from './core/application/confirm-reservation/confirm-reservation.usecase';
import { ReservationEntity } from './secondary-adapters/orm/reservation.schema';
import { ReservationItemEntity } from './secondary-adapters/orm/reservation-item.schema';
import { GetOrderReservationsUseCase } from './core/application/get-order-reservations/get-order-reservations.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from './inventory.token';
import { PostgresReservationRepository } from './secondary-adapters/repositories/postgres-reservation-repository/postgres.reservation-repository';
import { ReservationRepository } from './core/domain/repositories/reservation.repository';
import { SeedDemoInventoryUseCase } from './core/application/seed/seed-demo-inventory.usecase';
import { ReconcileInventoryUseCase } from './core/application/reconcile-inventory/reconcile-inventory.usecase';
import { InventoryReconciliationJob } from './primary-adapters/jobs/inventory-reconciliation.job';
import { InventoryScheduler } from './core/domain/schedulers/inventory.scheduler';
import { BullMqInventoryScheduler } from './secondary-adapters/schedulers/bullmq-inventory.scheduler';
import { InventoryProcessor } from './inventory.processor';
import { InventoryQueryService } from './core/application/ports/inventory-query.service';
import { PostgresInventoryQueryAdapter } from './secondary-adapters/query/postgres-inventory-query.adapter';
import { ListInventoryUseCase } from './core/application/list-inventory/list-inventory.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryEntity,
      ReservationEntity,
      ReservationItemEntity,
    ]),
    BullModule.registerQueue({
      name: 'inventory',
    }),
    MetricsModule,
    RedisModule,
  ],
  controllers: [InventoryController],
  providers: [
    //Postgres Repo
    {
      provide: POSTGRES_INVENTORY_REPOSITORY,
      useClass: PostgresInventoryRepository,
    },

    // Redis Repo (decorator around Postgres)
    {
      provide: CACHED_INVENTORY_REPOSITORY,
      useFactory: (
        cacheService: CachePort,
        postgresRepo: PostgresInventoryRepository,
      ) => {
        return new CachedInventoryRepository(cacheService, postgresRepo);
      },
      inject: [CachePort, POSTGRES_INVENTORY_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: InventoryRepository,
      useExisting: CACHED_INVENTORY_REPOSITORY,
    },

    // Reservation Repository
    {
      provide: POSTGRES_RESERVATION_REPOSITORY,
      useClass: PostgresReservationRepository,
    },
    {
      provide: ReservationRepository,
      useExisting: POSTGRES_RESERVATION_REPOSITORY,
    },

    // Schedulers (Secondary Adapter Port -> Adapter)
    {
      provide: InventoryScheduler,
      useClass: BullMqInventoryScheduler,
    },

    //UseCases:
    GetInventoryUseCase,
    AdjustStockUseCase,
    ReserveStockUseCase,
    ReleaseStockUseCase,
    CheckStockUseCase,
    ListLowStockUseCase,
    BulkCheckStockUseCase,
    ConfirmReservationUseCase,
    GetOrderReservationsUseCase,
    SeedDemoInventoryUseCase,
    ReconcileInventoryUseCase,
    ListInventoryUseCase,

    // CQRS Presentation Query Service

    {
      provide: InventoryQueryService,
      useClass: PostgresInventoryQueryAdapter,
    },

    // Jobs & Processors:
    InventoryReconciliationJob,
    InventoryProcessor,
  ],
  exports: [
    InventoryQueryService,
    CheckStockUseCase,
    ReserveStockUseCase,
    ReleaseStockUseCase,
    ConfirmReservationUseCase,
    GetOrderReservationsUseCase,
    ReconcileInventoryUseCase,
  ],
})
export class InventoryModule {}
