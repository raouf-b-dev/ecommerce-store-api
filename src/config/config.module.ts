import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvConfigService } from './env-config.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EnvConfigService,
      useFactory: (configService: ConfigService) =>
        EnvConfigService.fromConfigService(configService),
      inject: [ConfigService],
    },
  ],
  exports: [EnvConfigService],
})
export class EnvConfigModule {}
