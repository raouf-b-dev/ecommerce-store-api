import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
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
import { AdjustStockUseCase } from './application/adjust-stock/adjust-stock.usecase';
import { GetInventoryUseCase } from './application/get-inventory/get-inventory.usecase';
import { ReserveStockUseCase } from './application/reserve-stock/reserve-stock.usecase';
import { BulkCheckStockUseCase } from './application/bulk-check-stock/bulk-check-stock.usecase';
import { CheckStockUseCase } from './application/check-stock/check-stock.usecase';
import { ListLowStockUseCase } from './application/list-low-stock/list-low-stock.usecase';
import { ReleaseStockUseCase } from './application/release-stock/release-stock.usecase';
import { ConfirmReservationUseCase } from './application/confirm-reservation/confirm-reservation.usecase';
import { ReservationEntity } from './infrastructure/orm/reservation.schema';
import { ReservationItemEntity } from './infrastructure/orm/reservation-item.schema';
import { GetOrderReservationsUseCase } from './application/get-order-reservations/get-order-reservations.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from './inventory.token';
import { PostgresReservationRepository } from './infrastructure/repositories/postgres-reservation-repository/postgres.reservation-repository';
import { ReservationRepository } from './domain/repositories/reservation.repository';

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
