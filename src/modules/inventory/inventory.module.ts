import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  POSTGRES_INVENTORY_REPOSITORY,
  REDIS_INVENTORY_REPOSITORY,
} from './inventory.token';
import { PostgresInventoryRepository } from './secondary-adapters/repositories/postgres-inventory-repository/postgres-inventory-repository';
import { RedisInventoryRepository } from './secondary-adapters/repositories/redis-inventory-repository/redis-inventory-repository';
import { CacheService } from '../../shared-kernel/infrastructure/redis/cache/cache.service';
import { InventoryRepository } from './core/domain/repositories/inventory.repository';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryEntity,
      ReservationEntity,
      ReservationItemEntity,
    ]),
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

    // Reservation Repository
    {
      provide: POSTGRES_RESERVATION_REPOSITORY,
      useClass: PostgresReservationRepository,
    },
    {
      provide: ReservationRepository,
      useExisting: POSTGRES_RESERVATION_REPOSITORY,
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
  ],
  exports: [
    CheckStockUseCase,
    ReserveStockUseCase,
    ReleaseStockUseCase,
    ConfirmReservationUseCase,
    GetOrderReservationsUseCase,
  ],
})
export class InventoryModule {}
