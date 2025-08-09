import { Injectable } from '@nestjs/common';
import { RedisJSON } from '@redis/json/dist/lib/commands';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisJsonClient {
  constructor(private readonly redisService: RedisService) {}

  async set(key: string, path: string, value: RedisJSON): Promise<void> {
    const fullKey = this.redisService.getFullKey(key);
    await this.redisService.client.json.set(fullKey, path, value);
  }

  async merge(key: string, path: string, partial: RedisJSON): Promise<void> {
    const fullKey = this.redisService.getFullKey(key);
    await this.redisService.client.json.merge(fullKey, path, partial);
  }

  async get(key: string, path?: string): Promise<RedisJSON | null> {
    const fullKey = this.redisService.getFullKey(key);
    return await this.redisService.client.json.get(fullKey, { path });
  }

  async del(key: string, path?: string): Promise<void> {
    const fullKey = this.redisService.getFullKey(key);
    await this.redisService.client.json.del(fullKey, path);
  }
}
