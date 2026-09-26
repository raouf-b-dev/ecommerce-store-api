// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
