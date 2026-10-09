import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';

@Module({
  controllers: [PlatformController],
})
export class PlatformModule {}
