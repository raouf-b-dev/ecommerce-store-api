import { Injectable } from '@nestjs/common';
import { FtSearchOptions } from 'redis';
import { RedisJsonClient } from '../clients/redis-json.client';
import { RedisKeyClient } from '../clients/redis-key.client';
import { RedisSearchClient } from '../clients/redis-search.client';
import { RedisService } from '../redis.service';

@Injectable()
export class CacheService {
  constructor(
    private readonly jsonClient: RedisJsonClient,
    private readonly keyClient: RedisKeyClient,
    private readonly searchClient: RedisSearchClient,
    private readonly redisService: RedisService,
  ) {}

  async ttl(key: string): Promise<number> {
    return this.keyClient.ttl(key);
  }

  async get<T>(key: string, path?: string): Promise<T | null> {
    const value = await this.jsonClient.get(key, path);
    return value as unknown as T;
  }

  async getAll<T>(
    index: string,
    query: string = '*',
    options?: FtSearchOptions,
  ): Promise<T[]> {
    const values = await this.searchClient.search(index, query, options);
    return values.documents.map((doc: any) => doc.value as T);
  }

  async set<T>(
    key: string,
    value: T,
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<void> {
    await this.jsonClient.set(key, path, value as any);
    await this.keyClient.expire(key, ttl);
  }

  async setAll(
    entries: { key: string; value: any }[],
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<void> {
    const pipeline = this.keyClient.createPipeline();

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);
      pipeline.json.set(fullKey, path, value);
      if (ttl) {
        pipeline.expire(fullKey, ttl);
      }
    }

    await pipeline.exec();
  }

  async merge<T>(
    key: string,
    partial: Partial<T>,
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<T | null> {
    await this.jsonClient.merge(key, path, partial as any);
    if (ttl) {
      await this.keyClient.expire(key, ttl);
    }
    return this.get<T>(key);
  }

  async mergeAll(
    entries: { key: string; value: any }[],
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<void> {
    const pipeline = this.keyClient.createPipeline();

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);
      pipeline.json.merge(fullKey, path, value);
      if (ttl) {
        pipeline.expire(fullKey, ttl);
      }
    }

    await pipeline.exec();
  }

  async delete(key: string): Promise<void> {
    await this.jsonClient.del(key);
  }

  async search<T>(
    index: string,
    query: string,
    options?: FtSearchOptions,
  ): Promise<T[]> {
    const result = await this.searchClient.search(index, query, options);
    return result.documents.map((doc: any) => doc.value as T);
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    return this.keyClient.scanKeys(pattern, count);
  }
}
