import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentEntity } from './secondary-adapters/orm/payment.schema';
import { RefundEntity } from './secondary-adapters/orm/refund.schema';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import {
  POSTGRES_PAYMENT_REPOSITORY,
  CACHED_PAYMENT_REPOSITORY,
} from './payment.token';
import { PostgresPaymentRepository } from './secondary-adapters/repositories/postgres-payment-repository/postgres.payment-repository';
import { CachePort } from '../../infrastructure/redis/cache/cache.port';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { createHealthAwareProxy } from '../../infrastructure/resilience/health-aware-proxy';
import { CachedPaymentRepository } from './secondary-adapters/repositories/cached-payment-repository/cached.payment-repository';
import { PaymentRepository } from './core/domain/repositories/payment.repository';
import { CreatePaymentUseCase } from './core/application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './core/application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './core/application/usecases/list-payments/list-payments.usecase';
import { CapturePaymentUseCase } from './core/application/usecases/capture-payment/capture-payment.usecase';
import { ProcessRefundUseCase } from './core/application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './core/application/usecases/verify-payment/verify-payment.usecase';
import { HandlePaymentWebhookService } from './core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { HandleStripeWebhookUseCase } from './core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { CreatePaymentIntentUseCase } from './core/application/usecases/create-payment-intent/create-payment-intent.usecase';
import { GetPaymentByOrderIdUseCase } from './core/application/usecases/get-payment-by-order-id/get-payment-by-order-id.usecase';

import { AuthenticationModule } from '../authentication/authentication.module';
import { PaymentGatewayFactory } from './secondary-adapters/gateways/payment-gateway.factory';
import { StripeGateway } from './secondary-adapters/gateways/stripe.gateway';
import { StripeSignatureService } from './secondary-adapters/services/stripe-signature.service';
import { StripeSignatureVerifier } from './core/application/ports/stripe-signature-verifier';
import { PaymentGatewayResolver } from './core/application/ports/payment-gateway-resolver';
import { BullModule } from '@nestjs/bullmq';
import { PaymentEventsScheduler } from './core/domain/schedulers/payment-events.scheduler';
import { BullMqPaymentEventsScheduler } from './secondary-adapters/schedulers/bullmq-payment-events.scheduler';
import { PaymentQueryService } from './core/application/ports/payment-query.service';
import { PostgresPaymentQueryAdapter } from './secondary-adapters/query/postgres-payment-query.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, RefundEntity]),
    RedisModule,
    AuthenticationModule,
    BullModule.registerQueue({
      name: 'payment-events',
    }),
  ],
  controllers: [PaymentsController],
  providers: [
    // Gateways
    StripeGateway,
    PaymentGatewayFactory,
    {
      provide: PaymentGatewayResolver,
      useExisting: PaymentGatewayFactory,
    },

    // Services
    StripeSignatureService,
    {
      provide: StripeSignatureVerifier,
      useExisting: StripeSignatureService,
    },

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
      provide: CACHED_PAYMENT_REPOSITORY,
      useFactory: (
        cacheService: CachePort,
        postgresRepo: PostgresPaymentRepository,
      ) => {
        return new CachedPaymentRepository(
          cacheService,
          postgresRepo,
          new Logger(CachedPaymentRepository.name),
        );
      },
      inject: [CachePort, POSTGRES_PAYMENT_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: PaymentRepository,
      useFactory: (
        cachedRepo: PaymentRepository,
        postgresRepo: PaymentRepository,
        redis: RedisService,
      ) =>
        createHealthAwareProxy(cachedRepo, postgresRepo, () => redis.isReady()),
      inject: [
        CACHED_PAYMENT_REPOSITORY,
        POSTGRES_PAYMENT_REPOSITORY,
        RedisService,
      ],
    },

    // Use Cases
    CreatePaymentUseCase,
    GetPaymentUseCase,
    ListPaymentsUseCase,
    CapturePaymentUseCase,
    ProcessRefundUseCase,
    VerifyPaymentUseCase,
    HandlePaymentWebhookService,
    HandleStripeWebhookUseCase,
    CreatePaymentIntentUseCase,
    GetPaymentByOrderIdUseCase,
    // CQRS Presentation Query Service
    {
      provide: PaymentQueryService,
      useClass: PostgresPaymentQueryAdapter,
    },
  ],
  exports: [
    PaymentQueryService,
    PaymentRepository,
    CreatePaymentUseCase,
    GetPaymentByOrderIdUseCase,
    PaymentGatewayResolver,
    ProcessRefundUseCase,
    CreatePaymentIntentUseCase,
  ],
})
export class PaymentsModule {}
