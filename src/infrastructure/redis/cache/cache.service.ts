import { Injectable } from '@nestjs/common';
import { FtSearchOptions, RedisJSON } from 'redis';
import { RedisJsonClient } from '../clients/redis-json.client';
import { RedisKeyClient } from '../clients/redis-key.client';
import { RedisSearchClient } from '../clients/redis-search.client';
import { RedisService } from '../redis.service';
import { SearchOptions } from '../types';
import { CachePort } from './cache.port';

interface SetOptions {
  path?: string;
  ttl?: number;
  nx?: boolean;
}

@Injectable()
export class CacheService implements CachePort {
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

  async getMany<T>(keys: string[], path: string = '$'): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const values = await this.jsonClient.mGet(keys, path);
    return values as unknown as (T | null)[];
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
  ): Promise<boolean> {
    const isSet = await this.jsonClient.set(key, path, value as RedisJSON, {
      nx,
    });
    if (isSet && ttl) {
      await this.keyClient.expire(key, ttl);
    }
    return isSet;
  }

  async setAll(
    entries: { key: string; value: any }[],
    {
      path = '$',
      ttl = 3600,
      nx = false,
    }: { path?: string; ttl?: number; nx?: boolean } = {},
  ): Promise<void> {
    if (!entries || entries.length === 0) return;
    const pipeline = this.keyClient.createPipeline();
    if (!pipeline) return;

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);

      const args: any[] = [fullKey, path, value];
      if (ttl) args.push('EX', ttl);
      if (nx) args.push('NX');

      pipeline.json.set(...args);
    }

    try {
      await pipeline.exec();
    } catch {
      // Redis pipeline failure handled gracefully
    }
  }

  async merge<T>(
    key: string,
    partial: Partial<T>,
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<T | null> {
    await this.jsonClient.merge(key, path, partial as RedisJSON);
    if (ttl) {
      await this.keyClient.expire(key, ttl);
    }
    return this.get<T>(key);
  }

  async mergeAll(
    entries: { key: string; value: any }[],
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<void> {
    if (!entries || entries.length === 0) return;
    const pipeline = this.keyClient.createPipeline();
    if (!pipeline) return;

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);
      pipeline.json.merge(fullKey, path, value);
      if (ttl) {
        pipeline.expire(fullKey, ttl);
      }
    }

    try {
      await pipeline.exec();
    } catch {
      // Redis pipeline failure handled gracefully
    }
  }

  async delete(key: string): Promise<void> {
    await this.jsonClient.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.scanKeys(pattern);
    if (keys.length === 0) return;

    const pipeline = this.keyClient.createPipeline();
    if (!pipeline) return;

    keys.forEach((key) => pipeline.del(this.redisService.getFullKey(key)));

    try {
      await pipeline.exec();
    } catch {
      // Redis pipeline failure handled gracefully
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
