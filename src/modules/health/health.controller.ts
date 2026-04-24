import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { WebSocketHealthIndicator } from './indicators/websocket.health-indicator';
import { ServiceUnavailableException } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly websocket: WebSocketHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    try {
      return await this.health.check([
        () => this.db.pingCheck('postgres', { timeout: 3000 }),
        () => this.redis.isHealthy('redis'),
        () => this.websocket.isHealthy('websocket'),
      ]);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        return error.getResponse();
      }
      throw error;
    }
  }
}
