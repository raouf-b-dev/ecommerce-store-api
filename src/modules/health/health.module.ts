// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { WebSocketHealthIndicator } from './indicators/websocket.health-indicator';
import { ProcessHealthIndicator } from './indicators/process.health-indicator';
import { WebsocketModule } from '../../infrastructure/websocket/websocket.module';

@Module({
  imports: [TerminusModule, WebsocketModule],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    WebSocketHealthIndicator,
    ProcessHealthIndicator,
  ],
})
export class HealthModule {}
