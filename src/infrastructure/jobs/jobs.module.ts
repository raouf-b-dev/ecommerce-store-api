// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { Global, Module } from '@nestjs/common';
import { JobConfigService } from './job-config.service';

@Global()
@Module({
  providers: [JobConfigService],
  exports: [JobConfigService],
})
export class JobsModule {}
