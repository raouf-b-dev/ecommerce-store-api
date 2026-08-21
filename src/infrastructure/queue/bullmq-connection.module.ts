import { Module } from '@nestjs/common';
import { EnvConfigModule } from 'src/config/config.module';
import { EnvConfigService } from 'src/config/env-config.service';
import { buildIoRedisConnection } from '../redis/redis-connection.options';
import {
  BULLMQ_CONNECTION_OPTIONS,
  BullMqConnectionOptions,
} from './bullmq-connection.token';

/**
 * Builds BullMQ connection options once for QueueModule, FlowProducer, and QueueEvents.
 */
@Module({
  imports: [EnvConfigModule],
  providers: [
    {
      provide: BULLMQ_CONNECTION_OPTIONS,
      useFactory: (
        envConfigService: EnvConfigService,
      ): BullMqConnectionOptions =>
        buildIoRedisConnection(envConfigService.redis),
      inject: [EnvConfigService],
    },
  ],
  exports: [BULLMQ_CONNECTION_OPTIONS],
})
export class BullMqConnectionModule {}
