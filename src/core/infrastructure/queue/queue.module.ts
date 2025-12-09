import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnvConfigService } from '../../../config/env-config.service';
import { EnvConfigModule } from '../../../config/config.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [
        EnvConfigModule,
        BullModule.registerQueue({
          name: 'checkout',
        }),
        BullModule.registerQueue({
          name: 'notifications',
        }),
      ],
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
  ],
  exports: [BullModule],
})
export class QueueModule {}
