import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { JobsModule } from './jobs/jobs.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { JwtModule } from './jwt/jwt.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdempotencyModule,
    JwtModule,
  ],
  providers: [],
  exports: [
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdempotencyModule,
    JwtModule,
  ],
})
export class InfrastructureModule {}
