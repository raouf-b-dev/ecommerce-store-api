// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Global, Module } from '@nestjs/common';
import { JobConfigService } from './job-config.service';

@Global()
@Module({
  providers: [JobConfigService],
  exports: [JobConfigService],
})
export class JobsModule {}
