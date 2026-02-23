import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { JobsModule } from './jobs/jobs.module';
import { IdempotencyModule } from './idempotency/idempotency.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdempotencyModule,
  ],
  providers: [],
  exports: [
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdempotencyModule,
  ],
})
export class InfrastructureModule {}
