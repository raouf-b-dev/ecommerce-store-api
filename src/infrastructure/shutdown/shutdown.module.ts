import { Global, Module } from '@nestjs/common';
import { ShutdownService } from './shutdown.service';
import { ApplicationLifecyclePort } from '../../shared-kernel/domain/interfaces/application-lifecycle.port';

@Global()
@Module({
  providers: [
    ShutdownService,
    {
      provide: ApplicationLifecyclePort,
      useExisting: ShutdownService,
    },
  ],
  exports: [ShutdownService, ApplicationLifecyclePort],
})
export class ShutdownModule {}
