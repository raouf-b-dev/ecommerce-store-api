import { Logger, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentEntity } from './secondary-adapters/orm/payment.schema';
import { RefundEntity } from './secondary-adapters/orm/refund.schema';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import {
  POSTGRES_PAYMENT_REPOSITORY,
  REDIS_PAYMENT_REPOSITORY,
} from './payment.token';
import { PostgresPaymentRepository } from './secondary-adapters/repositories/postgres-payment-repository/postgres.payment-repository';
import { CacheService } from '../../shared-kernel/infrastructure/redis/cache/cache.service';
import { RedisPaymentRepository } from './secondary-adapters/repositories/redis-payment-repository/redis.payment-repository';
import { PaymentRepository } from './core/domain/repositories/payment.repository';
import { CreatePaymentUseCase } from './core/application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './core/application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './core/application/usecases/list-payments/list-payments.usecase';
import { CapturePaymentUseCase } from './core/application/usecases/capture-payment/capture-payment.usecase';
import { ProcessRefundUseCase } from './core/application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './core/application/usecases/verify-payment/verify-payment.usecase';
import { RecordCodPaymentUseCase } from './core/application/usecases/record-cod-payment/record-cod-payment.usecase';
import { HandlePaymentWebhookService } from './core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { HandleStripeWebhookUseCase } from './core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { HandlePayPalWebhookUseCase } from './core/application/usecases/handle-paypal-webhook/handle-paypal-webhook.usecase';
import { CreatePaymentIntentUseCase } from './core/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { AuthModule } from '../auth/auth.module';
import { PaymentGatewayFactory } from './secondary-adapters/gateways/payment-gateway.factory';
import { CodGateway } from './secondary-adapters/gateways/cod.gateway';
import { StripeGateway } from './secondary-adapters/gateways/stripe.gateway';
import { PayPalGateway } from './secondary-adapters/gateways/paypal.gateway';
import { StripeSignatureService } from './secondary-adapters/services/stripe-signature.service';
import { PayPalSignatureService } from './secondary-adapters/services/paypal-signature.service';
import { BullModule } from '@nestjs/bullmq';
import { PaymentEventsScheduler } from './core/domain/schedulers/payment-events.scheduler';
import { BullMqPaymentEventsScheduler } from './secondary-adapters/schedulers/bullmq-payment-events.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, RefundEntity]),
    RedisModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'payment-events',
    }),
  ],
  controllers: [PaymentsController],
  providers: [
    // Gateways
    CodGateway,
    StripeGateway,
    PayPalGateway,
    PaymentGatewayFactory,

    // Services
    StripeSignatureService,
    PayPalSignatureService,

    // Schedulers
    {
      provide: PaymentEventsScheduler,
      useClass: BullMqPaymentEventsScheduler,
    },

    // Postgres Repo
    {
      provide: POSTGRES_PAYMENT_REPOSITORY,
      useClass: PostgresPaymentRepository,
    },

    // Redis Repo (decorator around Postgres)
    {
      provide: REDIS_PAYMENT_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresPaymentRepository,
      ) => {
        return new RedisPaymentRepository(
          cacheService,
          postgresRepo,
          new Logger(RedisPaymentRepository.name),
        );
      },
      inject: [CacheService, POSTGRES_PAYMENT_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: PaymentRepository,
      useExisting: REDIS_PAYMENT_REPOSITORY,
    },

    // Use Cases
    CreatePaymentUseCase,
    GetPaymentUseCase,
    ListPaymentsUseCase,
    CapturePaymentUseCase,
    ProcessRefundUseCase,
    VerifyPaymentUseCase,
    RecordCodPaymentUseCase,
    HandlePaymentWebhookService,
    HandleStripeWebhookUseCase,
    HandlePayPalWebhookUseCase,
    CreatePaymentIntentUseCase,
  ],
  exports: [
    PaymentRepository,
    CreatePaymentUseCase,
    PaymentGatewayFactory,
    RecordCodPaymentUseCase,
    ProcessRefundUseCase,
    CreatePaymentIntentUseCase,
  ],
})
export class PaymentsModule {}
