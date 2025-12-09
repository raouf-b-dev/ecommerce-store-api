import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { JobsModule } from './jobs/jobs.module';
import { IdGeneratorService } from './orm/id-generator.service';

@Global()
@Module({
  imports: [DatabaseModule, RedisModule, QueueModule, JobsModule],
  providers: [IdGeneratorService],
  exports: [
    DatabaseModule,
    RedisModule,
    QueueModule,
    JobsModule,
    IdGeneratorService,
  ],
})
export class InfrastructureModule {}
