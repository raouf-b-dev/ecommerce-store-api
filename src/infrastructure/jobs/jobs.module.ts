import { Global, Module } from '@nestjs/common';
import { JobConfigService } from './job-config.service';

@Global()
@Module({
  providers: [JobConfigService],
  exports: [JobConfigService],
})
export class JobsModule {}
