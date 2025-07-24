import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/getOrder.controller';
import { GetOrderUseCase } from './application/use-cases/getOrder.usecase';
import { OrderRepository } from './domain/repositories/order-repository';
import {
  POSTGRES_ORDER_REPOSITORY,
  REDIS_ORDER_REPOSITORY,
} from './order.token';
import { RedisOrderRepository } from './infrastructure/repositories/redis.order-repository';
import { PostgresOrderRepository } from './infrastructure/repositories/postgres.order-repository';

@Module({
  controllers: [OrdersController],
  providers: [
    // External Repos

    // Postgres Repo
    {
      provide: POSTGRES_ORDER_REPOSITORY,
      useFactory: () => {
        return new PostgresOrderRepository();
      },
      inject: [],
    },

    // Redis Repo
    {
      provide: REDIS_ORDER_REPOSITORY,
      useFactory: (pgRepo: PostgresOrderRepository) =>
        new RedisOrderRepository(pgRepo),
      inject: [POSTGRES_ORDER_REPOSITORY],
    },

    // Interface Bindings
    {
      provide: OrderRepository,
      useExisting: REDIS_ORDER_REPOSITORY,
    },

    // Usecases
    GetOrderUseCase,

    // Controllers
    GetOrderController,
  ],
})
export class OrdersModule {}
