import type { RedisClientOptions } from 'redis';
import type { IAppConfig } from '../../config/configuration';

export type RedisConfig = IAppConfig['redis'];

/**
 * Single source of truth for Redis host/port/password/db/reconnect.
 * Consumers (separate TCP sockets by design - see REDIS.md client inventory):
 * - buildNodeRedisClientOptions → RedisService, Socket.IO pub/sub
 * - buildIoRedisConnection → BullMQ (via BULLMQ_CONNECTION_OPTIONS), FlowProducer, QueueEvents
 * - buildThrottlerIoRedisOptions → throttler storage (fail-fast retries; not shared with BullMQ)
 */

/** Max reconnect delay shared by node-redis and ioredis clients. */
export const REDIS_RECONNECT_MAX_MS = 10_000;

export function redisReconnectDelay(retries: number): number {
  return Math.min(retries * 500, REDIS_RECONNECT_MAX_MS);
}

/**
 * Shared node-redis client options (cache, Socket.IO pub/sub).
 * Key prefixing is applied in application code via RedisService.getFullKey.
 */
export function buildNodeRedisClientOptions(
  redis: RedisConfig,
): RedisClientOptions {
  return {
    url: `redis://${redis.host}:${redis.port}`,
    password: redis.password || undefined,
    database: redis.db,
    socket: {
      reconnectStrategy: redisReconnectDelay,
    },
  };
}

/**
 * Shared ioredis / BullMQ connection fields (host, port, password, db).
 */
export function buildIoRedisConnection(redis: RedisConfig): {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
} {
  return {
    host: redis.host,
    port: redis.port,
    password: redis.password || undefined,
    db: redis.db,
  };
}

/**
 * ioredis options for throttler storage (fail fast when Redis is down).
 */
export function buildThrottlerIoRedisOptions(redis: RedisConfig) {
  return {
    ...buildIoRedisConnection(redis),
    enableOfflineQueue: false as const,
    maxRetriesPerRequest: 1,
    retryStrategy: redisReconnectDelay,
  };
}
