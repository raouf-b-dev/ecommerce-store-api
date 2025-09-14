import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisKeyClient {
  constructor(private readonly redisService: RedisService) {}

  async ttl(key: string): Promise<number> {
    const fullKey = this.redisService.getFullKey(key);
    return await this.redisService.client.ttl(fullKey);
  }

  async expire(key: string, ttl: number = 3600): Promise<number> {
    const fullKey = this.redisService.getFullKey(key);
    return await this.redisService.client.expire(fullKey, ttl);
  }

  async exists(key: string): Promise<number> {
    const fullKey = this.redisService.getFullKey(key);
    return await this.redisService.client.exists(fullKey);
  }

  createPipeline() {
    return this.redisService.client.multi();
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    const fullPattern = this.redisService.getFullKey(pattern);

    const found: string[] = [];
    let cursor: string = '0';

    do {
      const result = await this.redisService.client.scan(cursor.toString(), {
        MATCH: fullPattern,
        COUNT: count,
      });

      const nextCursor = result.cursor;
      const keys: string[] = result.keys.map((key: string) =>
        this.redisService.removePrefix(key),
      );

      cursor = nextCursor;
      found.push(...keys);
    } while (cursor !== '0');

    return found;
  }
}
