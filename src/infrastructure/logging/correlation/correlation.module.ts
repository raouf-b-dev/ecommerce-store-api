// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Global, Module } from '@nestjs/common';
import { CorrelationService } from './correlation.service';

/**
 * Global module - makes CorrelationService available everywhere
 * without explicit imports in every module.
 */
@Global()
@Module({
  providers: [CorrelationService],
  exports: [CorrelationService],
})
export class CorrelationModule {}
