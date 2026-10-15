import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { GetPlatformConfigQuery } from './get-platform-config.query';

@Module({
  controllers: [PlatformController],
  providers: [GetPlatformConfigQuery],
})
export class PlatformModule {}
