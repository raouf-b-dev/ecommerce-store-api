import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { JobsModule } from './jobs/jobs.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { JwtModule } from './jwt/jwt.module';
import { WinstonLoggerService } from './logging/winston-logger.service';
import { CorrelationModule } from './logging/correlation/correlation.module';
import { CorrelationIdMiddleware } from './logging/middleware/correlation-id.middleware';
import { HttpLoggingMiddleware } from './logging/middleware/http-logging.middleware';
import { AppThrottlerModule } from './throttler/throttler.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import { DomainEventPublisher } from '../shared-kernel/domain/interfaces/domain-event-publisher';
import { EventEmitter2DomainEventPublisher } from './events/event-emitter2.domain-event-publisher';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdempotencyModule,
    JwtModule,
    CorrelationModule,
    AppThrottlerModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    MetricsModule,
  ],
  providers: [
    WinstonLoggerService,
    {
      provide: DomainEventPublisher,
      useClass: EventEmitter2DomainEventPublisher,
    },
  ],
  exports: [
    // Infrastructure modules
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdempotencyModule,
    JwtModule,

    // Logging & Correlation
    WinstonLoggerService,
    CorrelationModule,
    AppThrottlerModule,

    // Metrics & Events
    MetricsModule,
    DomainEventPublisher,
  ],
})
export class InfrastructureModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // MetricsMiddleware MUST run first so request duration captures the full lifecycle.
    // CorrelationIdMiddleware MUST run before HttpLoggingMiddleware
    // so the correlation context is available when the HTTP log is written.
    consumer
      .apply(MetricsMiddleware, CorrelationIdMiddleware, HttpLoggingMiddleware)
      .forRoutes('*');
  }
}
