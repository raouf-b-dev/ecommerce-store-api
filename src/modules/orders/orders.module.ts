import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/GetOrder/get-order.controller';
import { GetOrderUseCase } from './application/usecases/GetOrder/get-order.usecase';

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
import { CreateOrderController } from './presentation/controllers/CreateOrder/create-order.controller';
import { CreateOrderUseCase } from './application/usecases/CreateOrder/create-order.usecase';
import { OrderFactory } from './domain/factories/order.factory';
import { ListOrdersController } from './presentation/controllers/ListOrders/list-orders.controller';
import { ListOrdersUsecase } from './application/usecases/ListOrders/list-orders.usecase';
import { CancelOrderController } from './presentation/controllers/CancelOrder/cancel-order.controller';
import { CancelOrderUseCase } from './application/usecases/CancelOrder/cancel-order.usecase';

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

    // Domain
    OrderFactory,

    // Use cases
    CreateOrderUseCase,
    GetOrderUseCase,
    ListOrdersUsecase,
    CancelOrderUseCase,

    // Controllers
    CreateOrderController,
    GetOrderController,
    ListOrdersController,
    CancelOrderController,
  ],
})
export class OrdersModule {}
