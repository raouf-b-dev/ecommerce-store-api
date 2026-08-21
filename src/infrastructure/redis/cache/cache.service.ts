import { Injectable, Optional } from '@nestjs/common';
import { FtSearchOptions, RedisJSON } from 'redis';
import {
  CachePort,
  CacheSearchOptions,
} from '../../../shared-kernel/domain/interfaces/cache.port';
import { MetricsService } from '../../metrics/metrics.service';
import { RedisService } from '../redis.service';
import { toRedisJson } from './cache-json';

interface SetOptions {
  path?: string;
  ttl?: number;
  nx?: boolean;
}

type SearchDocument = {
  id: string;
  value: RedisJSON;
};

function isSearchDocument(doc: unknown): doc is SearchDocument {
  if (typeof doc !== 'object' || doc === null) {
    return false;
  }
  if (!('value' in doc)) {
    return false;
  }
  return doc.value !== undefined;
}

function toFtSearchOptions(searchOptions: CacheSearchOptions): FtSearchOptions {
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
      DIRECTION: sortOrder === 'desc' ? 'DESC' : 'ASC',
    };
  }

  return options;
}

/**
 * Fail-open cache adapter. Redis outages return empty/false/null — callers
 * (cache-aside repositories) fall back to PostgreSQL.
 */
@Injectable()
export class CacheService implements CachePort {
  constructor(
    private readonly redisService: RedisService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  isAvailable(): boolean {
    return this.redisService.isReady();
  }

  async ttl(key: string): Promise<number> {
    return this.redisService.ttl(key);
  }

  async get<T>(key: string, path?: string): Promise<T | null> {
    const value = await this.redisService.jsonGet(key, path);
    if (value === null) {
      this.metrics?.redisCacheMissesTotal.inc();
      return null;
    }
    this.metrics?.redisCacheHitsTotal.inc();
    return value as T;
  }

  async getMany<T>(keys: string[], path: string = '$'): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const values = await this.redisService.jsonMGet(keys, path);
    let hits = 0;
    let misses = 0;
    const mapped = values.map((value) => {
      if (value === null) {
        misses += 1;
        return null;
      }
      hits += 1;
      return value as T;
    });
    if (hits > 0) this.metrics?.redisCacheHitsTotal.inc(hits);
    if (misses > 0) this.metrics?.redisCacheMissesTotal.inc(misses);
    return mapped;
  }

  async getAll<T>(
    index: string,
    query: string = '*',
    searchOptions: CacheSearchOptions = {},
  ): Promise<T[]> {
    const values = await this.redisService.search(
      index,
      query,
      toFtSearchOptions(searchOptions),
    );
    return values.documents.flatMap((doc) =>
      isSearchDocument(doc) ? [doc.value as T] : [],
    );
  }

  async set<T>(
    key: string,
    value: T,
    { path = '$', ttl = 3600, nx = false }: SetOptions = {},
  ): Promise<boolean> {
    return this.redisService.jsonSet(key, path, toRedisJson(value), {
      nx,
      ttl: ttl || undefined,
    });
  }

  async setAll(
    entries: ReadonlyArray<{ key: string; value: unknown }>,
    {
      path = '$',
      ttl = 3600,
      nx = false,
    }: { path?: string; ttl?: number; nx?: boolean } = {},
  ): Promise<void> {
    if (!entries || entries.length === 0) return;
    const pipeline = this.redisService.createPipeline();
    if (!pipeline) return;

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);
      const setOpts = nx ? { NX: true as const } : {};
      pipeline.json.set(fullKey, path, toRedisJson(value), setOpts);
      if (ttl) {
        pipeline.expire(fullKey, ttl);
      }
    }

    try {
      await pipeline.exec();
    } catch {
      // Fail-open: pipeline failure is swallowed
    }
  }

  async merge<T>(
    key: string,
    partial: Partial<T>,
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<T | null> {
    await this.redisService.jsonMerge(key, path, toRedisJson(partial), {
      ttl: ttl || undefined,
    });
    return this.get<T>(key);
  }

  async mergeAll(
    entries: ReadonlyArray<{ key: string; value: unknown }>,
    { path = '$', ttl = 3600 }: { path?: string; ttl?: number } = {},
  ): Promise<void> {
    if (!entries || entries.length === 0) return;
    const pipeline = this.redisService.createPipeline();
    if (!pipeline) return;

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);
      pipeline.json.merge(fullKey, path, toRedisJson(value));
      if (ttl) {
        pipeline.expire(fullKey, ttl);
      }
    }

    try {
      await pipeline.exec();
    } catch {
      // Fail-open: pipeline failure is swallowed
    }
  }

  async delete(key: string): Promise<void> {
    await this.redisService.jsonDel(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.scanKeys(pattern);
    if (keys.length === 0) return;

    const pipeline = this.redisService.createPipeline();
    if (!pipeline) return;

    keys.forEach((key) => pipeline.del(this.redisService.getFullKey(key)));

    try {
      await pipeline.exec();
    } catch {
      // Fail-open: pipeline failure is swallowed
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redisService.exists(key)) === 1;
  }

  async search<T>(
    index: string,
    query: string,
    options?: CacheSearchOptions,
  ): Promise<T[]> {
    const result = await this.redisService.search(
      index,
      query,
      options ? toFtSearchOptions(options) : undefined,
    );
    return result.documents.flatMap((doc) =>
      isSearchDocument(doc) ? [doc.value as T] : [],
    );
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    return this.redisService.scanKeys(pattern, count);
  }
}
