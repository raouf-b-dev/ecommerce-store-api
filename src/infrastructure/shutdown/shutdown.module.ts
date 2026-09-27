// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

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
