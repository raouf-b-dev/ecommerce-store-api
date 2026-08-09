import { CachePort } from '../../infrastructure/redis/cache/cache.port';

export class MockCacheService implements CachePort {
  ttl = jest.fn<Promise<number>, [string]>();
  get = jest.fn<Promise<any>, [string, string?]>().mockResolvedValue(null);
  getMany = jest
    .fn<Promise<any[]>, [string[], string?]>()
    .mockResolvedValue([]);

  getAll = jest
    .fn<Promise<any[]>, [string, string?, any?]>()
    .mockResolvedValue([]);
  set = jest
    .fn<Promise<boolean>, [string, any, any?]>()
    .mockResolvedValue(true);

  setAll = jest.fn<Promise<void>, [any[], any?]>().mockResolvedValue(undefined);
  merge = jest.fn<Promise<any>, [string, any, any?]>();
  mergeAll = jest.fn<Promise<void>, [any[], any?]>();
  delete = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
  deletePattern = jest.fn<Promise<void>, [string]>();
  exists = jest.fn<Promise<boolean>, [string]>();
  search = jest
    .fn<Promise<any[]>, [string, string, any?]>()
    .mockResolvedValue([]);
  scanKeys = jest.fn<Promise<string[]>, [string, number?]>();
}
