import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { CapturePaymentController } from './presentation/controllers/capture-payment/capture-payment.controller';
import { CreatePaymentController } from './presentation/controllers/create-payment/create-payment.controller';
import { GetPaymentController } from './presentation/controllers/get-payment/get-payment.controller';
import { ListPaymentsController } from './presentation/controllers/list-payments/list-payments.controller';
import { ProcessRefundController } from './presentation/controllers/process-refund/process-refund.controller';
import { RecordCodPaymentController } from './presentation/controllers/record-cod-payment/record-cod-payment.controller';
import { VerifyPaymentController } from './presentation/controllers/verify-payment/verify-payment.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, RefundEntity]),
    RedisModule,
  ],
  controllers: [PaymentsController],
  providers: [
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

    // Use Cases
    CreatePaymentUseCase,
    GetPaymentUseCase,
    ListPaymentsUseCase,
    CapturePaymentUseCase,
    ProcessRefundUseCase,
    VerifyPaymentUseCase,
    RecordCodPaymentUseCase,
  ],
  exports: [
    // Use cases for cross-module integration
    CreatePaymentUseCase,
    GetPaymentUseCase,
    RecordCodPaymentUseCase,
    // Repository for direct access when needed
    PaymentRepository,
  ],
})
export class PaymentsModule {}
