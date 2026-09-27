import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { WebSocketHealthIndicator } from './indicators/websocket.health-indicator';
import { ProcessHealthIndicator } from './indicators/process.health-indicator';
import {
  createHealthCheckServiceMock,
  createTypeOrmHealthIndicatorMock,
  createRedisHealthIndicatorMock,
  createWebSocketHealthIndicatorMock,
  createProcessHealthIndicatorMock,
} from './testing';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let dbIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let redisIndicator: jest.Mocked<RedisHealthIndicator>;
  let processIndicator: jest.Mocked<ProcessHealthIndicator>;

  beforeEach(async () => {
    healthCheckService = createHealthCheckServiceMock();
    dbIndicator = createTypeOrmHealthIndicatorMock();
    redisIndicator = createRedisHealthIndicatorMock();
    processIndicator = createProcessHealthIndicatorMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: dbIndicator },
        { provide: RedisHealthIndicator, useValue: redisIndicator },
        {
          provide: WebSocketHealthIndicator,
          useValue: createWebSocketHealthIndicatorMock(),
        },
        { provide: ProcessHealthIndicator, useValue: processIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return composite health status', async () => {
      const result: HealthCheckResult = await controller.check();
      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('should propagate ServiceUnavailableException when health check fails', async () => {
      healthCheckService.check.mockRejectedValueOnce(
        new ServiceUnavailableException('Health check failed'),
      );
      await expect(controller.check()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('liveness', () => {
    it('should execute liveness probe checking process indicator', async () => {
      const result: HealthCheckResult = await controller.liveness();
      expect(healthCheckService.check).toHaveBeenCalled();
      expect(processIndicator.isHealthy).toHaveBeenCalledWith('process');
      expect(result.status).toBe('ok');
    });

    it('should propagate ServiceUnavailableException when liveness fails', async () => {
      healthCheckService.check.mockRejectedValueOnce(
        new ServiceUnavailableException('Liveness check failed'),
      );
      await expect(controller.liveness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('readiness', () => {
    it('should execute readiness probe checking postgres only', async () => {
      const result: HealthCheckResult = await controller.readiness();
      expect(healthCheckService.check).toHaveBeenCalled();
      expect(dbIndicator.pingCheck).toHaveBeenCalledWith('postgres', {
        timeout: 3000,
      });
      expect(redisIndicator.isHealthy).not.toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('should propagate ServiceUnavailableException when readiness fails', async () => {
      healthCheckService.check.mockRejectedValueOnce(
        new ServiceUnavailableException('Readiness check failed'),
      );
      await expect(controller.readiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
