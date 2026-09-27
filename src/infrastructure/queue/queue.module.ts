import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnvConfigService } from 'src/config/env-config.service';
import { EnvConfigModule } from 'src/config/config.module';
import { BullMqConnectionModule } from './bullmq-connection.module';
import {
  BULLMQ_CONNECTION_OPTIONS,
  BullMqConnectionOptions,
} from './bullmq-connection.token';
import { FlowProducerService } from './flow-producer.service';
import { QueueEventsService } from './queue-events.service';

@Global()
@Module({
  imports: [
    EnvConfigModule,
    BullMqConnectionModule,
    BullModule.forRootAsync({
      imports: [BullMqConnectionModule, EnvConfigModule],
      useFactory: (
        connection: BullMqConnectionOptions,
        envConfigService: EnvConfigService,
      ) => ({
        connection,
        prefix: envConfigService.redis.key_prefix,
      }),
      inject: [BULLMQ_CONNECTION_OPTIONS, EnvConfigService],
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [FlowProducerService, QueueEventsService],
  exports: [
    BullModule,
    BullMqConnectionModule,
    FlowProducerService,
    QueueEventsService,
  ],
})
export class QueueModule {}
