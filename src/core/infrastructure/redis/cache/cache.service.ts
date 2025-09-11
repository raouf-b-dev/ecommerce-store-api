import { Injectable } from '@nestjs/common';
import { FtSearchOptions } from 'redis';
import { RedisJsonClient } from '../clients/redis-json.client';
import { RedisKeyClient } from '../clients/redis-key.client';
import { RedisSearchClient } from '../clients/redis-search.client';
import { RedisService } from '../redis.service';
import { SearchOptions } from '../types';

interface SetOptions {
  path?: string;
  ttl?: number;
  nx?: boolean;
}

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
    searchOptions: SearchOptions = {},
  ): Promise<T[]> {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc' } = searchOptions;

    const options: FtSearchOptions = {
      LIMIT: {
        from: (page - 1) * limit,
        size: limit,
      },
    };

    if (sortBy) {
      options.SORTBY = {
        BY: sortBy,
        DIRECTION: sortOrder.toUpperCase() as 'ASC' | 'DESC',
      };
    }

    const values = await this.searchClient.search(index, query, options);
    return values.documents.map((doc: any) => doc.value as T);
  }

  async set<T>(
    key: string,
    value: T,
    { path = '$', ttl = 3600, nx = false }: SetOptions = {},
  ): Promise<void> {
    await this.jsonClient.set(key, path, value as any, { nx });
    await this.keyClient.expire(key, ttl);
  }

  async setAll(
    entries: { key: string; value: any }[],
    {
      path = '$',
      ttl = 3600,
      nx = false,
    }: { path?: string; ttl?: number; nx?: boolean } = {},
  ): Promise<void> {
    const pipeline = this.keyClient.createPipeline();

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);

      const args: any[] = [fullKey, path, value];
      if (ttl) args.push('EX', ttl);
      if (nx) args.push('NX');

      (pipeline.json as any).set(...args);
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

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.scanKeys(pattern);
    if (keys.length > 0) {
      const pipeline = this.keyClient.createPipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.keyClient.exists(key)) === 1;
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
