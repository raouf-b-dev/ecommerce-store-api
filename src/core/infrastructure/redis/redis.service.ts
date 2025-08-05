import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisJSON } from '@redis/json/dist/lib/commands';
import { createClient, FtSearchOptions } from 'redis';
import { EnvConfigService } from '../../../config/env-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client;

  constructor(private envConfigService: EnvConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      url: `redis://${this.envConfigService.redis.host}:${this.envConfigService.redis.port}`,
      password: this.envConfigService.redis.password,
      database: this.envConfigService.redis.db,
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // JSON Operations
  async jsonSet(key: string, path: string, value: RedisJSON): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.client.json.set(fullKey, path, value);
  }

  async jsonMerge(
    key: string,
    path: string,
    partial: RedisJSON,
  ): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.client.json.merge(fullKey, path, partial);
  }

  async jsonGet(key: string, path?: string): Promise<RedisJSON> {
    const fullKey = this.getFullKey(key);
    return await this.client.json.get(fullKey, { path });
  }

  async jsonDel(key: string, path?: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.client.json.del(fullKey, path);
  }

  // Search Operations
  async search(index: string, query: string, options?: FtSearchOptions) {
    const fullIndex = this.getFullKey(index);
    return await this.client.ft.search(fullIndex, query, options);
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    const fullPattern = this.getFullKey(pattern);

    const found: string[] = [];
    let cursor: string = '0'; // ✅ Start with string '0'

    do {
      const result = await this.client.scan(cursor.toString(), {
        MATCH: fullPattern,
        COUNT: count,
      });

      const nextCursor = result.cursor;
      const keys = result.keys.map((key) => this.removePrefix(key));

      cursor = nextCursor;
      found.push(...keys);
    } while (cursor !== '0');

    return found;
  }

  async createIndex(index: string, schema: any, prefix: string) {
    const fullIndex = this.getFullKey(index);
    const fullPrefix = this.getFullKey(prefix); // Reuses prefix logic
    await this.client.ft.create(fullIndex, schema, {
      ON: 'JSON',
      PREFIX: [fullPrefix],
    });
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
  async expire(key: string, ttl: number = 3600): Promise<number> {
    return this.client.expire(this.getFullKey(key), ttl);
  }

  createPipeline() {
    return this.client.multi();
  }

  public getFullKey(key: string): string {
    const prefix = this.envConfigService.redis.key_prefix;
    return `${prefix}${key}`;
  }

  public removePrefix(fullKey: string): string {
    const prefix = this.envConfigService.redis.key_prefix;
    return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
  }
}
