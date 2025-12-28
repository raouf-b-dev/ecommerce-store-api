import { Logger, Module, forwardRef } from '@nestjs/common';
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
import { OrderFactory } from './domain/factories/order.factory';
import { ListOrdersController } from './presentation/controllers/list-orders/list-orders.controller';
import { ListOrdersUsecase } from './application/usecases/list-orders/list-orders.usecase';
import { CancelOrderController } from './presentation/controllers/cancel-order/cancel-order.controller';
import { CancelOrderUseCase } from './application/usecases/cancel-order/cancel-order.usecase';
import { ShippingAddressEntity } from './infrastructure/orm/shipping-address.schema';
import { ConfirmOrderController } from './presentation/controllers/confirm-order/confirm-order.controller';
import { ConfirmOrderUseCase } from './application/usecases/confirm-order/confirm-order.usecase';
import { ShipOrderUseCase } from './application/usecases/ship-order/ship-order.usecase';
import { ShipOrderController } from './presentation/controllers/ship-order/ship-order.controller';
import { DeliverOrderController } from './presentation/controllers/deliver-order/deliver-order.controller';
import { DeliverOrderUseCase } from './application/usecases/deliver-order/deliver-order.usecase';
import { ProcessOrderUseCase } from './application/usecases/process-order/process-order.usecase';
import { ProcessOrderController } from './presentation/controllers/process-order/process-order.controller';
import { PaymentsModule } from '../payments/payments.module';
import { CheckoutController } from './presentation/controllers/checkout/checkout.controller';
import { CheckoutUseCase } from './application/usecases/checkout/checkout.usecase';
import { CreateOrderFromCartUseCase } from './application/usecases/create-order-from-cart/create-order-from-cart.usecase';
import { CustomersModule } from '../customers/customers.module';
import { CheckoutFailureListener } from './presentation/listeners/checkout-failure.listener';
import { CartsModule } from '../carts/carts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrderScheduler } from './domain/schedulers/order.scheduler';
import { BullMqOrderScheduler } from './infrastructure/schedulers/bullmq-checkout.scheduler';
import { BullModule } from '@nestjs/bullmq';
import { PaymentEventsProcessor } from './payment-events.processor';
import { HandlePaymentCompletedUseCase } from './application/usecases/handle-payment-completed/handle-payment-completed.usecase';
import { HandlePaymentFailedUseCase } from './application/usecases/handle-payment-failed/handle-payment-failed.usecase';
import { ExpirePendingOrdersUseCase } from './application/usecases/expire-pending-orders/expire-pending-orders.usecase';
import { PaymentCompletedStep } from './presentation/jobs/payment-completed.job';
import { PaymentFailedStep } from './presentation/jobs/payment-failed.job';
import { ExpirePendingOrdersJob } from './presentation/jobs/expire-pending-orders.job';
import { ReleaseOrderStockJob } from './presentation/jobs/release-order-stock.job';
import { ReleaseOrderStockUseCase } from './application/usecases/release-order-stock/release-order-stock.usecase';
import { ShippingAddressResolver } from './domain/services/shipping-address-resolver';
import { PaymentMethodPolicy } from './domain/services/payment-method-policy';
import { ValidateCheckoutUseCase } from './application/usecases/validate-checkout/validate-checkout.usecase';
import { ValidateCartStep } from './presentation/jobs/validate-cart.job';
import { ReserveStockStep } from './presentation/jobs/reserve-stock-job/reserve-stock.job';
import { CreateOrderStep } from './presentation/jobs/create-order.job';
import { ProcessPaymentStep } from './presentation/jobs/process-payment.job';
import { ConfirmReservationStep } from './presentation/jobs/confirm-reservation.job';
import { ClearCartStep } from './presentation/jobs/clear-cart.job';
import { ReleaseStockStep } from './presentation/jobs/release-stock.job';
import { CancelOrderStep } from './presentation/jobs/cancel-order.job';
import { RefundPaymentStep } from './presentation/jobs/refund-payment.job';
import { FinalizeCheckoutStep } from './presentation/jobs/finalize-checkout.job';
import { ConfirmOrderStep } from './presentation/jobs/confirm-order.job';
import { OrdersProcessor } from './orders.processor';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      ShippingAddressEntity,
    ]),
    RedisModule,
    RedisModule,
    PaymentsModule,
    CustomersModule,
    CartsModule,
    InventoryModule,
    BullModule.registerQueue({
      name: 'checkout',
    }),
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

    // Schedulers
    {
      provide: OrderScheduler,
      useClass: BullMqOrderScheduler,
    },

    // Domain
    OrderFactory,
    ShippingAddressResolver,
    PaymentMethodPolicy,

    // Use cases
    GetOrderUseCase,
    ListOrdersUsecase,
    CancelOrderUseCase,
    ConfirmOrderUseCase,
    DeliverOrderUseCase,
    ShipOrderUseCase,
    ProcessOrderUseCase,
    CheckoutUseCase,
    CreateOrderFromCartUseCase,
    HandlePaymentCompletedUseCase,
    HandlePaymentFailedUseCase,
    ExpirePendingOrdersUseCase,
    ReleaseOrderStockUseCase,
    ValidateCheckoutUseCase,

    // Job Handlers
    PaymentCompletedStep,
    PaymentFailedStep,
    ExpirePendingOrdersJob,
    ReleaseOrderStockJob,
    ValidateCartStep,
    ReserveStockStep,
    CreateOrderStep,
    ProcessPaymentStep,
    ConfirmReservationStep,
    ClearCartStep,
    ReleaseStockStep,
    CancelOrderStep,
    RefundPaymentStep,
    FinalizeCheckoutStep,
    ConfirmOrderStep,

    // Controllers
    CheckoutController,
    GetOrderController,
    ListOrdersController,
    CancelOrderController,
    ConfirmOrderController,
    DeliverOrderController,
    ShipOrderController,
    ProcessOrderController,

    // Listeners
    CheckoutFailureListener,

    // Processors
    PaymentEventsProcessor,
    OrdersProcessor,
  ],
  exports: [OrderRepository],
})
export class OrdersModule {}
