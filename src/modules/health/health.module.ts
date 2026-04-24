import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { WebSocketHealthIndicator } from './indicators/websocket.health-indicator';
import { WebsocketModule } from '../../infrastructure/websocket/websocket.module';

@Module({
  imports: [TerminusModule, WebsocketModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, WebSocketHealthIndicator],
})
export class HealthModule {}
