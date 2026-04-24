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
  ],
  providers: [WinstonLoggerService],
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
  ],
})
export class InfrastructureModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CorrelationIdMiddleware MUST run before HttpLoggingMiddleware
    // so the correlation context is available when the HTTP log is written.
    consumer
      .apply(CorrelationIdMiddleware, HttpLoggingMiddleware)
      .forRoutes('*');
  }
}
