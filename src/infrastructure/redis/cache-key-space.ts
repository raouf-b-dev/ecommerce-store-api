import {
  CART_REDIS,
  INVENTORY_REDIS,
  ORDER_REDIS,
  PAYMENT_REDIS,
  PRODUCT_REDIS,
  USER_REDIS,
} from './constants/redis.constants';

const VERSIONED_NAMESPACES = [
  USER_REDIS.CACHE_KEY,
  USER_REDIS.INDEX,
  USER_REDIS.IS_CACHED_FLAG,
  PRODUCT_REDIS.CACHE_KEY,
  PRODUCT_REDIS.INDEX,
  PRODUCT_REDIS.IS_CACHED_FLAG,
  INVENTORY_REDIS.CACHE_KEY,
  INVENTORY_REDIS.INDEX,
  INVENTORY_REDIS.IS_CACHED_FLAG,
  CART_REDIS.CACHE_KEY,
  CART_REDIS.INDEX,
  CART_REDIS.IS_CACHED_FLAG,
  ORDER_REDIS.CACHE_KEY,
  ORDER_REDIS.INDEX,
  ORDER_REDIS.IS_CACHED_FLAG,
  PAYMENT_REDIS.CACHE_KEY,
  PAYMENT_REDIS.INDEX,
  PAYMENT_REDIS.IS_CACHED_FLAG,
] as const;

export const CACHE_GENERATION_META_KEY = 'meta:cache_generation';

/**
 * Domain cache / RediSearch keys participate in generation invalidation.
 * Idempotency and meta keys stay on a stable prefix.
 */
export function isVersionedCacheKey(logicalKey: string): boolean {
  return VERSIONED_NAMESPACES.some(
    (ns) => logicalKey === ns || logicalKey.startsWith(`${ns}:`),
  );
}

export const VERSIONED_IS_CACHED_FLAGS = [
  USER_REDIS.IS_CACHED_FLAG,
  PRODUCT_REDIS.IS_CACHED_FLAG,
  INVENTORY_REDIS.IS_CACHED_FLAG,
  CART_REDIS.IS_CACHED_FLAG,
  ORDER_REDIS.IS_CACHED_FLAG,
  PAYMENT_REDIS.IS_CACHED_FLAG,
] as const;

/** RediSearch logical index names that participate in generation versioning. */
export const VERSIONED_SEARCH_INDEXES = [
  USER_REDIS.INDEX,
  PRODUCT_REDIS.INDEX,
  INVENTORY_REDIS.INDEX,
  CART_REDIS.INDEX,
  ORDER_REDIS.INDEX,
  PAYMENT_REDIS.INDEX,
] as const;

/** Env prefix only - meta / idempotency keys must not rotate with cache generation. */
export function buildStableFullKey(envPrefix: string, key: string): string {
  return `${envPrefix}${key}`;
}

/** Versioned or stable full key for a given cache generation. */
export function buildFullKey(
  envPrefix: string,
  generation: number,
  key: string,
): string {
  if (isVersionedCacheKey(key)) {
    return `${envPrefix}c${generation}:${key}`;
  }
  return `${envPrefix}${key}`;
}

/** Strip env prefix and optional `c{n}:` generation segment from a Redis key. */
export function stripKeyPrefix(envPrefix: string, fullKey: string): string {
  if (!fullKey.startsWith(envPrefix)) {
    return fullKey;
  }
  let rest = fullKey.slice(envPrefix.length);
  const generationMatch = /^c\d+:/.exec(rest);
  if (generationMatch) {
    rest = rest.slice(generationMatch[0].length);
  }
  return rest;
}
