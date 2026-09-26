// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { BusinessMetricsListener } from './listeners/business-metrics.listener';
import { InfraMetricsCollector } from './collectors/infra-metrics.collector';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsMiddleware,
    BusinessMetricsListener,
    InfraMetricsCollector,
  ],
  exports: [MetricsService, MetricsMiddleware],
})
export class MetricsModule {}
