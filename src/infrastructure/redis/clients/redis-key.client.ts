import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisKeyClient {
  constructor(private readonly redisService: RedisService) {}

  async ttl(key: string): Promise<number> {
    return this.redisService.ttl(key);
  }

  async expire(key: string, ttl: number = 3600): Promise<number> {
    return this.redisService.expire(key, ttl);
  }

  async exists(key: string): Promise<number> {
    return this.redisService.exists(key);
  }

  createPipeline() {
    return this.redisService.createPipeline();
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    return this.redisService.scanKeys(pattern, count);
  }
}
