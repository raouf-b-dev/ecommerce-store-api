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
 * Uses discrete host/port (+ optional TLS) so passwords need not be URL-encoded.
 */
export function buildNodeRedisClientOptions(
  redis: RedisConfig,
): RedisClientOptions {
  const common = {
    host: redis.host,
    port: redis.port,
    reconnectStrategy: redisReconnectDelay,
  };
  return {
    password: redis.password || undefined,
    database: redis.db,
    // Discriminated union: tls:true vs omitted/false (node-redis RedisSocketOptions).
    socket: redis.tls ? { ...common, tls: true } : common,
  };
}

/**
 * Shared ioredis / BullMQ connection fields (host, port, password, db, tls).
 */
export function buildIoRedisConnection(redis: RedisConfig): {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  tls?: Record<string, never>;
} {
  return {
    host: redis.host,
    port: redis.port,
    password: redis.password || undefined,
    db: redis.db,
    ...(redis.tls ? { tls: {} } : {}),
  };
}

/**
 * ioredis options for throttler storage (fail fast when Redis is down).
 */
export function buildThrottlerIoRedisOptions(redis: RedisConfig): {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  tls?: Record<string, never>;
  enableOfflineQueue: false;
  maxRetriesPerRequest: number;
  retryStrategy: (retries: number) => number;
} {
  return {
    ...buildIoRedisConnection(redis),
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: redisReconnectDelay,
  };
}
