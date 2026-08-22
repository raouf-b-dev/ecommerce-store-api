import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { toErrorMessage } from '../../../shared-kernel/infra/lang/error.utils';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    if (!this.redisService.isReady() || !this.redisService.client) {
      return indicator.down({ message: 'Redis client is not connected' });
    }

    try {
      const pingPromise = this.redisService.client.ping();
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(
          () => reject(new Error('Redis ping timeout (3000ms)')),
          3000,
        );
      });

      const response = await Promise.race([pingPromise, timeoutPromise]);

      if (response === 'PONG') {
        return indicator.up();
      }
      return indicator.down({
        message: `Unexpected PING response: ${response}`,
      });
    } catch (error) {
      return indicator.down({ message: toErrorMessage(error) });
    }
  }
}
