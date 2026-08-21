import { Injectable } from '@nestjs/common';
import { RedisJSON } from '@redis/json/dist/lib/commands';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisJsonClient {
  constructor(private readonly redisService: RedisService) {}

  async set(
    key: string,
    path: string,
    value: RedisJSON,
    options: { nx?: boolean } = {},
  ): Promise<boolean> {
    return this.redisService.jsonSet(key, path, value, options);
  }

  async merge(key: string, path: string, partial: RedisJSON): Promise<void> {
    await this.redisService.jsonMerge(key, path, partial);
  }

  async get(key: string, path?: string): Promise<RedisJSON | null> {
    return this.redisService.jsonGet(key, path);
  }

  async mGet(
    keys: string[],
    path: string = '$',
  ): Promise<(RedisJSON | null)[]> {
    return this.redisService.jsonMGet(keys, path);
  }

  async del(key: string, path?: string): Promise<void> {
    await this.redisService.jsonDel(key, path);
  }
}
