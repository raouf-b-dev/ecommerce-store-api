import { RedisJSON } from 'redis';

/**
 * Runtime narrow of JSON-serializable values to the redis client's {@link RedisJSON}.
 * Prefer this over `as RedisJSON` so domain DTOs do not need fake index signatures.
 */
export function isRedisJson(value: unknown): value is RedisJSON {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return true;
  }

  if (value instanceof Date) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isRedisJson);
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isRedisJson);
  }

  return false;
}

/**
 * Serialize a cache write payload to {@link RedisJSON} without assertion casts.
 * Round-trip drops non-JSON values (e.g. `undefined`, functions) the same way Redis would.
 */
export function toRedisJson(value: unknown): RedisJSON {
  const decoded: unknown = JSON.parse(JSON.stringify(value));
  if (!isRedisJson(decoded)) {
    throw new TypeError(
      'Cache payload is not RedisJSON-compatible after serialization',
    );
  }
  return decoded;
}
