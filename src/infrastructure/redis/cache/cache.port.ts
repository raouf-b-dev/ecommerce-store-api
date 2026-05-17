export abstract class CachePort {
  abstract ttl(key: string): Promise<number>;
  abstract get<T>(key: string, path?: string): Promise<T | null>;
  abstract getAll<T>(
    index: string,
    query?: string,
    options?: any,
  ): Promise<T[]>;
  abstract set<T>(
    key: string,
    value: T,
    options?: { path?: string; ttl?: number; nx?: boolean },
  ): Promise<void>;
  abstract setAll(
    entries: { key: string; value: any }[],
    options?: { path?: string; ttl?: number; nx?: boolean },
  ): Promise<void>;
  abstract merge<T>(
    key: string,
    partial: Partial<T>,
    options?: { path?: string; ttl?: number },
  ): Promise<T | null>;
  abstract mergeAll(
    entries: { key: string; value: any }[],
    options?: { path?: string; ttl?: number },
  ): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract deletePattern(pattern: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract search<T>(index: string, query: string, options?: any): Promise<T[]>;
  abstract scanKeys(pattern: string, count?: number): Promise<string[]>;
}
