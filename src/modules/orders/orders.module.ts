import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/GetOrder/get-order.controller';
import { GetOrderUseCase } from './application/use-cases/GetOrder/getOrder.usecase';

import { OrderRepository } from './domain/repositories/order-repository';
import {
  POSTGRES_ORDER_REPOSITORY,
  REDIS_ORDER_REPOSITORY,
} from './order.token';

import { RedisOrderRepository } from './infrastructure/repositories/RedisOrderRepository/redis.order-repository';
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository/postgres.order-repository';
import { OrderEntity } from './infrastructure/orm/order.schema';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { OrderItemEntity } from './infrastructure/orm/order-item.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
    RedisModule,
  ],

  controllers: [OrdersController],

  providers: [
    //Postgres Repo
    {
      provide: POSTGRES_ORDER_REPOSITORY,
      useClass: PostgresOrderRepository,
    },

    // Redis Repo (decorator around Postgres)
    {
      provide: REDIS_ORDER_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresOrderRepository,
      ) => {
        return new RedisOrderRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_ORDER_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: OrderRepository,
      useExisting: REDIS_ORDER_REPOSITORY,
    },

    // Use cases
    GetOrderUseCase,

    // Controllers
    GetOrderController,
  ],
})
export class OrdersModule {}
