/**
 * Pagination / sort options for cache search queries.
 * Kept free of Redis client types so driven ports stay tech-agnostic.
 */
export interface CacheSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Driven port for document KV cache-aside, RediSearch, and idempotency locks.
 * Implemented by {@link CacheService} in infrastructure (Redis).
 */
export abstract class CachePort {
  /** True when the underlying cache backend can accept commands. */
  abstract isAvailable(): boolean;

  abstract get<T>(key: string): Promise<T | null>;
  abstract getMany<T>(keys: string[]): Promise<(T | null)[]>;

  abstract set(
    key: string,
    value: unknown,
    options?: { ttl?: number; nx?: boolean },
  ): Promise<boolean>;

  abstract setAll(
    entries: ReadonlyArray<{ key: string; value: unknown }>,
    options?: { ttl?: number; nx?: boolean },
  ): Promise<void>;

  abstract delete(key: string): Promise<void>;

  /** Secondary-index / search reads (e.g. RediSearch). Query strings are adapter-owned. */
  abstract search<T>(
    index: string,
    query?: string,
    options?: CacheSearchOptions,
  ): Promise<T[]>;
}
