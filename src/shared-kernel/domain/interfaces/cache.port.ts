/**
 * Pagination / sort options for cache list and search queries.
 * Kept free of Redis client types so the driven port stays tech-agnostic.
 */
export interface CacheSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Driven port for cache-aside and related key/value + search ops.
 * Implemented by {@link CacheService} in infrastructure (Redis).
 */
export abstract class CachePort {
  /** True when the underlying cache backend can accept commands. */
  abstract isAvailable(): boolean;

  abstract ttl(key: string): Promise<number>;
  abstract get<T>(key: string, path?: string): Promise<T | null>;
  abstract getMany<T>(keys: string[], path?: string): Promise<(T | null)[]>;

  abstract getAll<T>(
    index: string,
    query?: string,
    options?: CacheSearchOptions,
  ): Promise<T[]>;

  abstract set<T>(
    key: string,
    value: T,
    options?: { path?: string; ttl?: number; nx?: boolean },
  ): Promise<boolean>;

  abstract setAll(
    entries: ReadonlyArray<{ key: string; value: unknown }>,
    options?: { path?: string; ttl?: number; nx?: boolean },
  ): Promise<void>;

  abstract merge<T>(
    key: string,
    partial: Partial<T>,
    options?: { path?: string; ttl?: number },
  ): Promise<T | null>;

  abstract mergeAll(
    entries: ReadonlyArray<{ key: string; value: unknown }>,
    options?: { path?: string; ttl?: number },
  ): Promise<void>;

  abstract delete(key: string): Promise<void>;
  abstract deletePattern(pattern: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;

  abstract search<T>(
    index: string,
    query: string,
    options?: CacheSearchOptions,
  ): Promise<T[]>;

  abstract scanKeys(pattern: string, count?: number): Promise<string[]>;
}
