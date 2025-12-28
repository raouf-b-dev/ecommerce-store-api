import { Logger, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { CapturePaymentController } from './presentation/controllers/capture-payment/capture-payment.controller';
import { CreatePaymentController } from './presentation/controllers/create-payment/create-payment.controller';
import { GetPaymentController } from './presentation/controllers/get-payment/get-payment.controller';
import { ListPaymentsController } from './presentation/controllers/list-payments/list-payments.controller';
import { ProcessRefundController } from './presentation/controllers/process-refund/process-refund.controller';
import { RecordCodPaymentController } from './presentation/controllers/record-cod-payment/record-cod-payment.controller';
import { VerifyPaymentController } from './presentation/controllers/verify-payment/verify-payment.controller';
import { StripeWebhookController } from './presentation/controllers/webhook/stripe-webhook.controller';
import { PayPalWebhookController } from './presentation/controllers/webhook/paypal-webhook.controller';
import { PaymentEntity } from './infrastructure/orm/payment.schema';
import { RefundEntity } from './infrastructure/orm/refund.schema';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import {
  POSTGRES_PAYMENT_REPOSITORY,
  REDIS_PAYMENT_REPOSITORY,
} from './payment.token';
import { PostgresPaymentRepository } from './infrastructure/repositories/postgres-payment-repository/postgres.payment-repository';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { RedisPaymentRepository } from './infrastructure/repositories/redis-payment-repository/redis.payment-repository';
import { PaymentRepository } from './domain/repositories/payment.repository';
import { CreatePaymentUseCase } from './application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './application/usecases/list-payments/list-payments.usecase';
import { CapturePaymentUseCase } from './application/usecases/capture-payment/capture-payment.usecase';
import { ProcessRefundUseCase } from './application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './application/usecases/verify-payment/verify-payment.usecase';
import { RecordCodPaymentUseCase } from './application/usecases/record-cod-payment/record-cod-payment.usecase';
import { HandlePaymentWebhookService } from './application/services/handle-payment-webhook/handle-payment-webhook.service';
import { HandleStripeWebhookUseCase } from './application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { HandlePayPalWebhookUseCase } from './application/usecases/handle-paypal-webhook/handle-paypal-webhook.usecase';
import { CreatePaymentIntentUseCase } from './application/usecases/create-payment-intent/create-payment-intent.usecase';
import { AuthModule } from '../auth/auth.module';
import { PaymentGatewayFactory } from './infrastructure/gateways/payment-gateway.factory';
import { CodGateway } from './infrastructure/gateways/cod.gateway';
import { StripeGateway } from './infrastructure/gateways/stripe.gateway';
import { PayPalGateway } from './infrastructure/gateways/paypal.gateway';
import { StripeSignatureService } from './infrastructure/services/stripe-signature.service';
import { PayPalSignatureService } from './infrastructure/services/paypal-signature.service';
import { BullModule } from '@nestjs/bullmq';
import { PaymentEventsScheduler } from './domain/schedulers/payment-events.scheduler';
import { BullMqPaymentEventsScheduler } from './infrastructure/schedulers/bullmq-payment-events.scheduler';

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

    // Controllers
    CreatePaymentController,
    GetPaymentController,
    ListPaymentsController,
    CapturePaymentController,
    ProcessRefundController,
    VerifyPaymentController,
    RecordCodPaymentController,
    StripeWebhookController,
    PayPalWebhookController,

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
