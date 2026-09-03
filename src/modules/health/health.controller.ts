import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
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
import { HealthCheckResponseDto } from './dto/health-check-response.dto';

import { Public } from '../../guards/decorators/public.decorator';

@ApiTags('health')
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
  @ApiOperation({
    summary: 'Aggregate health check',
    description:
      'Checks PostgreSQL, Redis, and WebSocket adapter status. Redis degradation is informational here; use readiness for traffic gating.',
  })
  @ApiOkResponse({
    type: HealthCheckResponseDto,
    description: 'Terminus health check result',
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
      () => this.redis.isHealthy('redis'),
      () => this.websocket.isHealthy('websocket'),
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Process viability check (event loop lag and RSS memory). Does not check external dependencies.',
  })
  @ApiOkResponse({
    type: HealthCheckResponseDto,
    description: 'Process liveness status',
  })
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.process.isHealthy('process')]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'PostgreSQL connectivity only. Redis is intentionally excluded — degraded Redis is reported via GET /health and metrics, not by blocking readiness.',
  })
  @ApiOkResponse({
    type: HealthCheckResponseDto,
    description: 'Dependency readiness for accepting traffic',
  })
  readiness(): Promise<HealthCheckResult> {
    // PostgreSQL is required for traffic; Redis degradation is reported via /health and metrics.
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 3000 }),
    ]);
  }
}
