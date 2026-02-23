import { Logger, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { GetOrderUseCase } from './core/application/usecases/get-order/get-order.usecase';

import { OrderRepository } from './core/domain/repositories/order-repository';
import {
  POSTGRES_ORDER_REPOSITORY,
  REDIS_ORDER_REPOSITORY,
  CUSTOMER_GATEWAY,
  CART_GATEWAY,
} from './order.token';

import { RedisOrderRepository } from './secondary-adapters/repositories/redis-order-repository/redis.order-repository';
import { PostgresOrderRepository } from './secondary-adapters/repositories/postgres-order-repository/postgres.order-repository';
import { ModuleCustomerGateway } from './secondary-adapters/adapters/module-customer.gateway';
import { ModuleCartGateway } from './secondary-adapters/adapters/module-cart.gateway';
import { OrderEntity } from './secondary-adapters/orm/order.schema';
import { CacheService } from '../../shared-kernel/infrastructure/redis/cache/cache.service';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { OrderItemEntity } from './secondary-adapters/orm/order-item.schema';
import { OrderFactory } from './core/domain/factories/order.factory';
import { ListOrdersUsecase } from './core/application/usecases/list-orders/list-orders.usecase';
import { CancelOrderUseCase } from './core/application/usecases/cancel-order/cancel-order.usecase';
import { ShippingAddressEntity } from './secondary-adapters/orm/shipping-address.schema';
import { ConfirmOrderUseCase } from './core/application/usecases/confirm-order/confirm-order.usecase';
import { ShipOrderUseCase } from './core/application/usecases/ship-order/ship-order.usecase';
import { DeliverOrderUseCase } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { ProcessOrderUseCase } from './core/application/usecases/process-order/process-order.usecase';
import { PaymentsModule } from '../payments/payments.module';
import { CheckoutUseCase } from './core/application/usecases/checkout/checkout.usecase';
import { CreateOrderFromCartUseCase } from './core/application/usecases/create-order-from-cart/create-order-from-cart.usecase';
import { CustomersModule } from '../customers/customers.module';
import { CheckoutFailureListener } from './primary-adapters/listeners/checkout-failure.listener';
import { CartsModule } from '../carts/carts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrderScheduler } from './core/domain/schedulers/order.scheduler';
import { BullMqOrderScheduler } from './secondary-adapters/schedulers/bullmq-checkout.scheduler';
import { BullModule } from '@nestjs/bullmq';
import { PaymentEventsProcessor } from './payment-events.processor';
import { HandlePaymentCompletedUseCase } from './core/application/usecases/handle-payment-completed/handle-payment-completed.usecase';
import { HandlePaymentFailedUseCase } from './core/application/usecases/handle-payment-failed/handle-payment-failed.usecase';
import { ExpirePendingOrdersUseCase } from './core/application/usecases/expire-pending-orders/expire-pending-orders.usecase';
import { PaymentCompletedStep } from './primary-adapters/jobs/payment-completed.job';
import { PaymentFailedStep } from './primary-adapters/jobs/payment-failed.job';
import { ExpirePendingOrdersJob } from './primary-adapters/jobs/expire-pending-orders.job';
import { ReleaseOrderStockJob } from './primary-adapters/jobs/release-order-stock.job';
import { ReleaseOrderStockUseCase } from './core/application/usecases/release-order-stock/release-order-stock.usecase';
import { ShippingAddressResolver } from './core/domain/services/shipping-address-resolver';
import { PaymentMethodPolicy } from './core/domain/services/payment-method-policy';
import { ValidateCheckoutUseCase } from './core/application/usecases/validate-checkout/validate-checkout.usecase';
import { ValidateCartStep } from './primary-adapters/jobs/validate-cart.job';
import { ReserveStockStep } from './primary-adapters/jobs/reserve-stock-job/reserve-stock.job';
import { CreateOrderStep } from './primary-adapters/jobs/create-order.job';
import { ProcessPaymentStep } from './primary-adapters/jobs/process-payment.job';
import { ConfirmReservationStep } from './primary-adapters/jobs/confirm-reservation.job';
import { ClearCartStep } from './primary-adapters/jobs/clear-cart.job';
import { ReleaseStockStep } from './primary-adapters/jobs/release-stock.job';
import { CancelOrderStep } from './primary-adapters/jobs/cancel-order.job';
import { RefundPaymentStep } from './primary-adapters/jobs/refund-payment.job';
import { FinalizeCheckoutStep } from './primary-adapters/jobs/finalize-checkout.job';
import { ConfirmOrderStep } from './primary-adapters/jobs/confirm-order.job';
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

    // Gateways
    {
      provide: CUSTOMER_GATEWAY,
      useClass: ModuleCustomerGateway,
    },
    {
      provide: CART_GATEWAY,
      useClass: ModuleCartGateway,
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

    // Listeners
    CheckoutFailureListener,

    // Processors
    PaymentEventsProcessor,
    OrdersProcessor,
  ],
  exports: [OrderRepository],
})
export class OrdersModule {}
