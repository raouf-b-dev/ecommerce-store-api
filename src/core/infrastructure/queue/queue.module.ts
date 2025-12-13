import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnvConfigService } from '../../../config/env-config.service';
import { EnvConfigModule } from '../../../config/config.module';
import { FlowProducerService } from './flow-producer.service';
import { QueueEventsService } from './queue-events.service';

@Global()
@Module({
  imports: [
    EnvConfigModule,
    BullModule.forRootAsync({
      imports: [EnvConfigModule],
      useFactory: async (envConfigService: EnvConfigService) => ({
        connection: {
          host: envConfigService.redis.host,
          port: envConfigService.redis.port,
          password: envConfigService.redis.password,
          db: envConfigService.redis.db,
        },
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
