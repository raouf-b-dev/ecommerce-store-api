import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnvConfigService } from 'src/config/env-config.service';
import { EnvConfigModule } from 'src/config/config.module';
import { buildIoRedisConnection } from '../redis/redis-connection.options';
import { FlowProducerService } from './flow-producer.service';
import { QueueEventsService } from './queue-events.service';

@Global()
@Module({
  imports: [
    EnvConfigModule,
    BullModule.forRootAsync({
      imports: [EnvConfigModule],
      useFactory: (envConfigService: EnvConfigService) => ({
        connection: buildIoRedisConnection(envConfigService.redis),
        prefix: envConfigService.redis.key_prefix,
      }),
      inject: [EnvConfigService],
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [FlowProducerService, QueueEventsService],
  exports: [BullModule, FlowProducerService, QueueEventsService],
})
export class QueueModule {}
