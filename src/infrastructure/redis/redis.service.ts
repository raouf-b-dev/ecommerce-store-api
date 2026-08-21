import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { RedisJSON } from '@redis/json/dist/lib/commands';
import {
  createClient,
  FtSearchOptions,
  RedisClientType,
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts,
} from 'redis';
import { EnvConfigService } from '../../config/env-config.service';
import { toErrorMessage } from '../../shared-kernel/infra/lang/error.utils';
import {
  CACHE_GENERATION_META_KEY,
  isVersionedCacheKey,
  VERSIONED_SEARCH_INDEXES,
} from './cache-key-space';
import { buildNodeRedisClientOptions } from './redis-connection.options';
import { logRedisError } from './redis-error.utils';

export type AppRedisClient = RedisClientType<
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts
>;

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  public client: AppRedisClient | null = null;
  private connected = false;
  private wasConnected = false;
  private cacheGeneration = 0;
  private reconnectListeners: Array<() => void | Promise<void>> = [];

  constructor(
    private envConfigService: EnvConfigService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    this.client = createClient(
      buildNodeRedisClientOptions(this.envConfigService.redis),
    ) as AppRedisClient;

    this.client.on('error', (err: unknown) =>
      logRedisError(this.logger, 'Redis client', err),
    );

    this.client.on('ready', () => {
      const isReconnect = this.wasConnected && !this.connected;
      this.connected = true;
      this.wasConnected = true;

      if (isReconnect) {
        this.logger.log('Redis reconnected — triggering recovery');
        this.notifyReconnectListeners();
      } else {
        this.logger.log('Redis connected');
      }
    });

    this.client.on('end', () => {
      this.connected = false;
      this.logger.warn('Redis disconnected');
    });

    try {
      await this.client.connect();
      this.connected = true;
      this.wasConnected = true;
      const { previousGeneration } = await this.bumpCacheGeneration();
      await this.dropVersionedIndexesForGeneration(previousGeneration);
    } catch (err) {
      this.logger.warn(
        `Redis unavailable at startup — app continues without cache: ${toErrorMessage(err)}`,
      );
    }
  }

  async waitUntilReady(timeoutMs = 5000): Promise<boolean> {
    if (this.isReady()) return true;
    const start = Date.now();
    while (!this.isReady() && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return this.isReady();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down Redis connection (signal: ${signal})`);
    try {
      await this.client?.quit();
    } catch {
      // Client may already be disconnected
    }
  }

  public isReady(): boolean {
    return this.connected && !!this.client?.isReady;
  }

  public getCacheGeneration(): number {
    return this.cacheGeneration;
  }

  /**
   * Bumps the Redis-persisted cache generation so versioned keys move to a new
   * namespace. Old keys expire via TTL. Used on startup and reconnect recovery.
   */
  async bumpCacheGeneration(): Promise<{
    previousGeneration: number;
    generation: number;
  }> {
    const previousGeneration = this.cacheGeneration;

    if (!this.isReady() || !this.client) {
      this.cacheGeneration += 1;
      this.logger.log(
        `Cache generation bumped locally to ${this.cacheGeneration} (Redis not ready)`,
      );
      return { previousGeneration, generation: this.cacheGeneration };
    }

    try {
      const metaKey = this.getStableFullKey(CACHE_GENERATION_META_KEY);
      this.cacheGeneration = await this.client.incr(metaKey);
      this.logger.log(`Cache generation bumped to ${this.cacheGeneration}`);
      return { previousGeneration, generation: this.cacheGeneration };
    } catch (error) {
      logRedisError(this.logger, 'RedisService.bumpCacheGeneration', error);
      this.cacheGeneration += 1;
      return { previousGeneration, generation: this.cacheGeneration };
    }
  }

  /**
   * Builds a versioned full key for an explicit generation (used to drop prior indexes).
   */
  public getFullKeyForGeneration(key: string, generation: number): string {
    const envPrefix = this.envConfigService.redis.key_prefix;
    if (!isVersionedCacheKey(key)) {
      return `${envPrefix}${key}`;
    }
    return `${envPrefix}c${generation}:${key}`;
  }

  /**
   * Drops a RediSearch index for a specific generation. Missing indexes are ignored.
   */
  async dropIndexForGeneration(
    index: string,
    generation: number,
  ): Promise<boolean> {
    if (!this.isReady() || !this.client || generation < 0) {
      return false;
    }

    const fullIndex = this.getFullKeyForGeneration(index, generation);
    try {
      await this.client.ft.dropIndex(fullIndex);
      this.logger.log(
        `Dropped RediSearch index '${index}' for generation ${generation}`,
      );
      return true;
    } catch (error) {
      const msg = toErrorMessage(error).toLowerCase();
      if (msg.includes('no such index') || msg.includes('unknown index')) {
        return false;
      }
      logRedisError(
        this.logger,
        `RedisService.dropIndexForGeneration("${index}", ${generation})`,
        error,
      );
      return false;
    }
  }

  async dropVersionedIndexesForGeneration(generation: number): Promise<void> {
    if (generation < 0) return;
    for (const index of VERSIONED_SEARCH_INDEXES) {
      await this.dropIndexForGeneration(index, generation);
    }
  }

  public onReconnect(listener: () => void | Promise<void>): void {
    this.reconnectListeners.push(listener);
  }

  private notifyReconnectListeners(): void {
    for (const listener of this.reconnectListeners) {
      try {
        const result = listener();
        if (result instanceof Promise) {
          result.catch((err) => {
            this.logReconnectListenerFailure(err);
          });
        }
      } catch (err) {
        this.logReconnectListenerFailure(err);
      }
    }
  }

  private logReconnectListenerFailure(err: unknown): void {
    this.logger.error(`Reconnect listener failed: ${toErrorMessage(err)}`);
  }

  async del(key: string): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      await this.client.del(this.getFullKey(key));
    } catch (error) {
      logRedisError(this.logger, `RedisService.del("${key}")`, error);
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady() || !this.client) return -1;
    try {
      return await this.client.ttl(this.getFullKey(key));
    } catch (error) {
      logRedisError(this.logger, `RedisService.ttl("${key}")`, error);
      return -1;
    }
  }

  async expire(key: string, ttl: number): Promise<number> {
    if (!this.isReady() || !this.client) return 0;
    try {
      return await this.client.expire(this.getFullKey(key), ttl);
    } catch (error) {
      logRedisError(this.logger, `RedisService.expire("${key}")`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.isReady() || !this.client) return 0;
    try {
      return await this.client.exists(this.getFullKey(key));
    } catch (error) {
      logRedisError(this.logger, `RedisService.exists("${key}")`, error);
      return 0;
    }
  }

  /**
   * Sets a JSON document. When ttl is set, uses MULTI so set + expire commit atomically.
   */
  async jsonSet(
    key: string,
    path: string,
    value: RedisJSON,
    options: { nx?: boolean; ttl?: number } = {},
  ): Promise<boolean> {
    if (!this.isReady() || !this.client) return false;
    try {
      const fullKey = this.getFullKey(key);
      const setOpts = options.nx ? { NX: true as const } : {};

      if (options.ttl && options.ttl > 0) {
        const multi = this.client.multi();
        multi.json.set(fullKey, path, value, setOpts);
        multi.expire(fullKey, options.ttl);
        const results = await multi.exec();
        return (results?.[0] as unknown) === 'OK';
      }

      const res = await this.client.json.set(fullKey, path, value, setOpts);
      return res === 'OK';
    } catch (error) {
      logRedisError(this.logger, `RedisService.jsonSet("${key}")`, error);
      return false;
    }
  }

  async jsonMerge(
    key: string,
    path: string,
    partial: RedisJSON,
    options: { ttl?: number } = {},
  ): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      const fullKey = this.getFullKey(key);
      if (options.ttl && options.ttl > 0) {
        const multi = this.client.multi();
        multi.json.merge(fullKey, path, partial);
        multi.expire(fullKey, options.ttl);
        await multi.exec();
        return;
      }
      await this.client.json.merge(fullKey, path, partial);
    } catch (error) {
      logRedisError(this.logger, `RedisService.jsonMerge("${key}")`, error);
    }
  }

  async jsonGet(key: string, path?: string): Promise<RedisJSON | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      const res = await this.client.json.get(this.getFullKey(key), {
        path,
      });
      return res ?? null;
    } catch (error) {
      logRedisError(this.logger, `RedisService.jsonGet("${key}")`, error);
      return null;
    }
  }

  async jsonMGet(
    keys: string[],
    path: string = '$',
  ): Promise<(RedisJSON | null)[]> {
    if (keys.length === 0) return [];
    if (!this.isReady() || !this.client) return keys.map(() => null);
    try {
      const fullKeys = keys.map((k) => this.getFullKey(k));
      const results = await this.client.json.mGet(fullKeys, path);
      return results || [];
    } catch (error) {
      logRedisError(this.logger, 'RedisService.jsonMGet', error);
      return keys.map(() => null);
    }
  }

  async jsonDel(key: string, path?: string): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      await this.client.json.del(
        this.getFullKey(key),
        path !== undefined ? { path } : undefined,
      );
    } catch (error) {
      logRedisError(this.logger, `RedisService.jsonDel("${key}")`, error);
    }
  }

  async search(
    index: string,
    query: string,
    options?: FtSearchOptions,
  ): Promise<{ total: number; documents: unknown[] }> {
    if (!this.isReady() || !this.client) return { total: 0, documents: [] };
    try {
      const fullIndex = this.getFullKey(index);
      return await this.client.ft.search(fullIndex, query, options);
    } catch (error) {
      const msg = toErrorMessage(error).toLowerCase();
      if (msg.includes('no such index') || msg.includes('unknown index')) {
        this.logger.debug(
          `RedisService.search("${index}") cache miss: index not found. Falling back to DB.`,
        );
        return { total: 0, documents: [] };
      }
      logRedisError(this.logger, `RedisService.search("${index}")`, error);
      return { total: 0, documents: [] };
    }
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    if (!this.isReady() || !this.client) return [];
    try {
      const fullPattern = this.getFullKey(pattern);
      const found: string[] = [];
      let cursor = '0';

      do {
        const result = await this.client.scan(cursor, {
          MATCH: fullPattern,
          COUNT: count,
        });

        const keys = result.keys.map((key) => this.removePrefix(key));
        cursor = result.cursor;
        found.push(...keys);
      } while (cursor !== '0');

      return found;
    } catch (error) {
      logRedisError(this.logger, `RedisService.scanKeys("${pattern}")`, error);
      return [];
    }
  }

  /**
   * Returns true when the RediSearch index exists.
   * Unknown-index replies are treated as absence; other errors are logged and rethrown.
   */
  async indexExists(index: string): Promise<boolean> {
    if (!this.isReady() || !this.client) return false;
    try {
      await this.client.ft.info(this.getFullKey(index));
      return true;
    } catch (error) {
      const msg = toErrorMessage(error).toLowerCase();
      if (msg.includes('no such index') || msg.includes('unknown index')) {
        return false;
      }
      logRedisError(this.logger, `RedisService.indexExists("${index}")`, error);
      throw error;
    }
  }

  /**
   * Creates a RediSearch index when missing.
   * @returns true if created now; false if it already existed or Redis is not ready.
   */
  async createIndex(
    index: string,
    // Schemas are defined with string `type` literals in redis.schemas.ts
    schema: Record<string, unknown>,
    prefix: string,
  ): Promise<boolean> {
    if (!this.isReady() || !this.client) return false;

    if (await this.indexExists(index)) {
      return false;
    }

    try {
      const fullIndex = this.getFullKey(index);
      const fullPrefix = this.getFullKey(prefix);
      await this.client.ft.create(
        fullIndex,
        schema as Parameters<AppRedisClient['ft']['create']>[1],
        {
          ON: 'JSON',
          PREFIX: [fullPrefix],
        },
      );
      return true;
    } catch (error) {
      if (toErrorMessage(error).includes('Index already exists')) {
        return false;
      }
      logRedisError(this.logger, `RedisService.createIndex("${index}")`, error);
      throw error;
    }
  }

  createPipeline() {
    return this.isReady() && this.client ? this.client.multi() : null;
  }

  /** Env key prefix only — used for meta keys that must not rotate with cache generation. */
  public getStableFullKey(key: string): string {
    return `${this.envConfigService.redis.key_prefix}${key}`;
  }

  public getFullKey(key: string): string {
    const envPrefix = this.envConfigService.redis.key_prefix;
    if (isVersionedCacheKey(key)) {
      return `${envPrefix}c${this.cacheGeneration}:${key}`;
    }
    return `${envPrefix}${key}`;
  }

  public removePrefix(fullKey: string): string {
    const envPrefix = this.envConfigService.redis.key_prefix;
    let rest = fullKey.startsWith(envPrefix)
      ? fullKey.slice(envPrefix.length)
      : fullKey;
    const generationMatch = /^c\d+:/.exec(rest);
    if (generationMatch) {
      rest = rest.slice(generationMatch[0].length);
    }
    return rest;
  }
}
