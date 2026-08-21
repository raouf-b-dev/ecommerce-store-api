import { Injectable, Optional } from '@nestjs/common';
import { FtSearchOptions, RedisJSON } from 'redis';
import {
  CachePort,
  CacheSearchOptions,
} from '../../../shared-kernel/domain/interfaces/cache.port';
import { MetricsService } from '../../metrics/metrics.service';
import { RedisService } from '../redis.service';
import { toRedisJson } from './cache-json';

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
 * Fail-open cache adapter implementing {@link CachePort}.
 * Redis outages return empty/false/null — callers fall back to PostgreSQL.
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

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisService.jsonGet(key, '$');
    if (value === null) {
      this.metrics?.redisCacheMissesTotal.inc();
      return null;
    }
    this.metrics?.redisCacheHitsTotal.inc();
    return unwrapJsonRoot(value) as T;
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const values = await this.redisService.jsonMGet(keys, '$');
    let hits = 0;
    let misses = 0;
    const mapped = values.map((value) => {
      if (value === null) {
        misses += 1;
        return null;
      }
      hits += 1;
      return unwrapJsonRoot(value) as T;
    });
    if (hits > 0) this.metrics?.redisCacheHitsTotal.inc(hits);
    if (misses > 0) this.metrics?.redisCacheMissesTotal.inc(misses);
    return mapped;
  }

  async set(
    key: string,
    value: unknown,
    { ttl = 3600, nx = false }: { ttl?: number; nx?: boolean } = {},
  ): Promise<boolean> {
    return this.redisService.jsonSet(key, '$', toRedisJson(value), {
      nx,
      ttl: ttl || undefined,
    });
  }

  async setAll(
    entries: ReadonlyArray<{ key: string; value: unknown }>,
    { ttl = 3600, nx = false }: { ttl?: number; nx?: boolean } = {},
  ): Promise<void> {
    if (!entries || entries.length === 0) return;
    const pipeline = this.redisService.createPipeline();
    if (!pipeline) return;

    for (const { key, value } of entries) {
      const fullKey = this.redisService.getFullKey(key);
      const setOpts = nx ? { NX: true as const } : {};
      pipeline.json.set(fullKey, '$', toRedisJson(value), setOpts);
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

  async search<T>(
    index: string,
    query: string = '*',
    options?: CacheSearchOptions,
  ): Promise<T[]> {
    const result = await this.redisService.search(
      index,
      query,
      options ? toFtSearchOptions(options) : toFtSearchOptions({}),
    );
    return result.documents.flatMap((doc) =>
      isSearchDocument(doc) ? [unwrapJsonRoot(doc.value) as T] : [],
    );
  }
}

/** RedisJSON GET with path `$` often wraps the document in a one-element array. */
function unwrapJsonRoot(value: RedisJSON): unknown {
  if (Array.isArray(value) && value.length === 1) {
    return value[0];
  }
  return value;
}
