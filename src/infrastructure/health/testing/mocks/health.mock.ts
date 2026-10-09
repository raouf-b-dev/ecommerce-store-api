import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../../indicators/redis.health-indicator';
import { WebSocketHealthIndicator } from '../../indicators/websocket.health-indicator';
import { ProcessHealthIndicator } from '../../indicators/process.health-indicator';
import { createUpResponse } from '../factories/health-response.factory';

export function createHealthCheckServiceMock(
  overrides: Partial<jest.Mocked<HealthCheckService>> = {},
): jest.Mocked<HealthCheckService> {
  const mock = {
    check: jest
      .fn()
      .mockImplementation(async (indicators: (() => unknown)[]) => {
        const details: Record<string, unknown> = {};
        for (const fn of indicators) {
          const res = await fn();
          Object.assign(details, res);
        }
        return {
          status: 'ok',
          info: details,
          error: {},
          details,
        };
      }),
  } as unknown as jest.Mocked<HealthCheckService>;

  return Object.assign(mock, overrides);
}

export function createTypeOrmHealthIndicatorMock(
  overrides: Partial<jest.Mocked<TypeOrmHealthIndicator>> = {},
): jest.Mocked<TypeOrmHealthIndicator> {
  const mock = {
    pingCheck: jest.fn().mockResolvedValue(createUpResponse('postgres')),
  } as unknown as jest.Mocked<TypeOrmHealthIndicator>;

  return Object.assign(mock, overrides);
}

export function createRedisHealthIndicatorMock(
  overrides: Partial<jest.Mocked<RedisHealthIndicator>> = {},
): jest.Mocked<RedisHealthIndicator> {
  const mock = {
    isHealthy: jest.fn().mockResolvedValue(createUpResponse('redis')),
  } as unknown as jest.Mocked<RedisHealthIndicator>;

  return Object.assign(mock, overrides);
}

export function createWebSocketHealthIndicatorMock(
  overrides: Partial<jest.Mocked<WebSocketHealthIndicator>> = {},
): jest.Mocked<WebSocketHealthIndicator> {
  const mock = {
    isHealthy: jest.fn().mockResolvedValue(createUpResponse('websocket')),
  } as unknown as jest.Mocked<WebSocketHealthIndicator>;

  return Object.assign(mock, overrides);
}

export function createProcessHealthIndicatorMock(
  overrides: Partial<jest.Mocked<ProcessHealthIndicator>> = {},
): jest.Mocked<ProcessHealthIndicator> {
  const mock = {
    isHealthy: jest.fn().mockResolvedValue(createUpResponse('process')),
  } as unknown as jest.Mocked<ProcessHealthIndicator>;

  return Object.assign(mock, overrides);
}
