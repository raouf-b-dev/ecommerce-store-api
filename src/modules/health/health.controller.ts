import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { WebSocketHealthIndicator } from './indicators/websocket.health-indicator';
import { ProcessHealthIndicator } from './indicators/process.health-indicator';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../../guards/decorators/public.decorator';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly websocket: WebSocketHealthIndicator,
    private readonly process: ProcessHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
      () => this.redis.isHealthy('redis'),
      () => this.websocket.isHealthy('websocket'),
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.process.isHealthy('process')]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    // PostgreSQL is required for traffic; Redis degradation is reported via /health and metrics.
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
    ]);
  }
}
