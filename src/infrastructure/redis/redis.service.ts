import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { RedisJSON } from '@redis/json/dist/lib/commands';
import { createClient, FtSearchOptions } from 'redis';
import { EnvConfigService } from '../../config/env-config.service';
import { toErrorMessage } from '../../shared-kernel/infra/lang/error.utils';
import { logRedisError } from './redis-error.utils';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  public client: any;
  private connected = false;
  private wasConnected = false;
  private reconnectListeners: Array<() => void | Promise<void>> = [];

  constructor(
    private envConfigService: EnvConfigService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    this.client = createClient({
      url: `redis://${this.envConfigService.redis.host}:${this.envConfigService.redis.port}`,
      password: this.envConfigService.redis.password,
      database: this.envConfigService.redis.db,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 500, 10_000),
      },
    });

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
    return this.connected && this.client?.isReady;
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
    if (!this.isReady()) return;
    try {
      await this.client.del(this.getFullKey(key));
    } catch (error) {
      logRedisError(this.logger, `RedisService.del("${key}")`, error);
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady()) return -1;
    try {
      return await this.client.ttl(this.getFullKey(key));
    } catch (error) {
      logRedisError(this.logger, `RedisService.ttl("${key}")`, error);
      return -1;
    }
  }

  async expire(key: string, ttl: number): Promise<number> {
    if (!this.isReady()) return 0;
    try {
      return await this.client.expire(this.getFullKey(key), ttl);
    } catch (error) {
      logRedisError(this.logger, `RedisService.expire("${key}")`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.isReady()) return 0;
    try {
      return await this.client.exists(this.getFullKey(key));
    } catch (error) {
      logRedisError(this.logger, `RedisService.exists("${key}")`, error);
      return 0;
    }
  }

  async jsonSet(
    key: string,
    path: string,
    value: RedisJSON,
    options: { nx?: boolean } = {},
  ): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const fullKey = this.getFullKey(key);
      const res = await this.client.json.set(
        fullKey,
        path,
        value,
        options.nx ? { NX: true } : {},
      );
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
  ): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client.json.merge(this.getFullKey(key), path, partial);
    } catch (error) {
      logRedisError(this.logger, `RedisService.jsonMerge("${key}")`, error);
    }
  }

  async jsonGet(key: string, path?: string): Promise<RedisJSON | null> {
    if (!this.isReady()) return null;
    try {
      const res = await this.client.json.get(this.getFullKey(key), { path });
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
    if (!this.isReady()) return keys.map(() => null);
    try {
      const fullKeys = keys.map((k) => this.getFullKey(k));
      const results = await this.client.json.mGet(fullKeys, path);
      return (results || []) as (RedisJSON | null)[];
    } catch (error) {
      logRedisError(this.logger, 'RedisService.jsonMGet', error);
      return keys.map(() => null);
    }
  }

  async jsonDel(key: string, path?: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client.json.del(this.getFullKey(key), path);
    } catch (error) {
      logRedisError(this.logger, `RedisService.jsonDel("${key}")`, error);
    }
  }

  async search(
    index: string,
    query: string,
    options?: FtSearchOptions,
  ): Promise<{ total: number; documents: any[] }> {
    if (!this.isReady()) return { total: 0, documents: [] };
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
    if (!this.isReady()) return [];
    try {
      const fullPattern = this.getFullKey(pattern);
      const found: string[] = [];
      let cursor: string = '0';

      do {
        const result = await this.client.scan(cursor.toString(), {
          MATCH: fullPattern,
          COUNT: count,
        });

        const cursorResult = result as { cursor: string; keys: string[] };
        const keys = cursorResult.keys.map((key) => this.removePrefix(key));
        cursor = cursorResult.cursor;
        found.push(...keys);
      } while (cursor !== '0');

      return found;
    } catch (error) {
      logRedisError(this.logger, `RedisService.scanKeys("${pattern}")`, error);
      return [];
    }
  }

  async createIndex(index: string, schema: any, prefix: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      const fullIndex = this.getFullKey(index);
      const fullPrefix = this.getFullKey(prefix);
      await this.client.ft.create(fullIndex, schema, {
        ON: 'JSON',
        PREFIX: [fullPrefix],
      });
    } catch (error) {
      logRedisError(this.logger, `RedisService.createIndex("${index}")`, error);
      throw error;
    }
  }

  createPipeline() {
    return this.isReady() && this.client ? this.client.multi() : null;
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
