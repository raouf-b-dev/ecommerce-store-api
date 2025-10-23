import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/get-order/get-order.controller';
import { GetOrderUseCase } from './application/usecases/get-order/get-order.usecase';

import { OrderRepository } from './domain/repositories/order-repository';
import {
  POSTGRES_ORDER_REPOSITORY,
  REDIS_ORDER_REPOSITORY,
} from './order.token';

import { RedisOrderRepository } from './infrastructure/repositories/redis-order-repository/redis.order-repository';
import { PostgresOrderRepository } from './infrastructure/repositories/postgres-order-repository/postgres.order-repository';
import { OrderEntity } from './infrastructure/orm/order.schema';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { OrderItemEntity } from './infrastructure/orm/order-item.schema';
import { CreateOrderController } from './presentation/controllers/create-order/create-order.controller';
import { CreateOrderUseCase } from './application/usecases/create-order/create-order.usecase';
import { OrderFactory } from './domain/factories/order.factory';
import { ListOrdersController } from './presentation/controllers/list-orders/list-orders.controller';
import { ListOrdersUsecase } from './application/usecases/list-orders/list-orders.usecase';
import { CancelOrderController } from './presentation/controllers/cancel-order/cancel-order.controller';
import { CancelOrderUseCase } from './application/usecases/cancel-order/cancel-order.usecase';
import { ShippingAddressEntity } from './infrastructure/orm/shipping-address.schema';
import { PaymentInfoEntity } from './infrastructure/orm/payment-info.schema';
import { CustomerInfoEntity } from './infrastructure/orm/customer-info.schema';
import { ConfirmOrderController } from './presentation/controllers/confirm-order/confirm-order.controller';
import { ConfirmOrderUseCase } from './application/usecases/confirm-order/confirm-order.usecase';
import { ShipOrderUseCase } from './application/usecases/ship-order/ship-order.usecase';
import { ShipOrderController } from './presentation/controllers/ship-order/ship-order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      ShippingAddressEntity,
      PaymentInfoEntity,
      CustomerInfoEntity,
    ]),
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
        logger: Logger,
      ) => {
        return new RedisOrderRepository(cacheService, postgresRepo, logger);
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
    ConfirmOrderUseCase,
    ShipOrderUseCase,

    // Controllers
    CreateOrderController,
    GetOrderController,
    ListOrdersController,
    CancelOrderController,
    ConfirmOrderController,
    ShipOrderController,
  ],
})
export class OrdersModule {}
