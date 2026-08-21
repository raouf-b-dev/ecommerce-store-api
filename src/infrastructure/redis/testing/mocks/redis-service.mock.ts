import { FtSearchOptions } from 'redis';

/**
 * Typed mock for {@link RedisService} used in unit tests.
 * Follows the project Mock* class convention (jest.fn fields + scenario helpers).
 */
export class MockRedisService {
  client = null;

  search = jest
    .fn<
      Promise<{ total: number; documents: unknown[] }>,
      [string, string, FtSearchOptions?]
    >()
    .mockResolvedValue({ total: 0, documents: [] });

  createIndex = jest
    .fn<Promise<boolean>, [string, unknown, string]>()
    .mockResolvedValue(true);

  indexExists = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);

  waitUntilReady = jest.fn<Promise<boolean>, []>().mockResolvedValue(true);

  isReady = jest.fn<boolean, []>().mockReturnValue(true);

  onReconnect = jest.fn();

  bumpCacheGeneration = jest
    .fn<Promise<{ previousGeneration: number; generation: number }>, []>()
    .mockResolvedValue({ previousGeneration: 0, generation: 1 });

  getCacheGeneration = jest.fn<number, []>().mockReturnValue(1);

  dropIndexForGeneration = jest
    .fn<Promise<boolean>, [string, number]>()
    .mockResolvedValue(false);

  dropVersionedIndexesForGeneration = jest
    .fn<Promise<void>, [number]>()
    .mockResolvedValue(undefined);

  getFullKeyForGeneration = jest
    .fn<string, [string, number]>()
    .mockImplementation(
      (key: string, generation: number) => `test:c${generation}:${key}`,
    );

  scanKeys = jest
    .fn<Promise<string[]>, [string, number?]>()
    .mockResolvedValue([]);

  createPipeline = jest.fn().mockReturnValue(null);

  getFullKey = jest
    .fn<string, [string]>()
    .mockImplementation((key: string) => `test:c1:${key}`);

  getStableFullKey = jest
    .fn<string, [string]>()
    .mockImplementation((key: string) => `test:${key}`);

  removePrefix = jest
    .fn<string, [string]>()
    .mockImplementation((key: string) => {
      let rest = key.startsWith('test:') ? key.slice(5) : key;
      if (/^c\d+:/.test(rest)) {
        rest = rest.replace(/^c\d+:/, '');
      }
      return rest;
    });

  jsonGet = jest.fn<Promise<unknown>, [string]>().mockResolvedValue(null);

  jsonSet = jest
    .fn<
      Promise<boolean>,
      [string, string, unknown, { nx?: boolean; ttl?: number }?]
    >()
    .mockResolvedValue(true);

  jsonMerge = jest.fn().mockResolvedValue(undefined);

  jsonMGet = jest.fn().mockResolvedValue([]);

  jsonDel = jest.fn().mockResolvedValue(undefined);

  del = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

  ttl = jest.fn().mockResolvedValue(-1);

  expire = jest.fn().mockResolvedValue(0);

  exists = jest.fn().mockResolvedValue(0);

  mockReady(): void {
    this.waitUntilReady.mockResolvedValue(true);
    this.isReady.mockReturnValue(true);
  }

  mockUnavailable(): void {
    this.waitUntilReady.mockResolvedValue(false);
    this.isReady.mockReturnValue(false);
  }

  mockIndexExists(): void {
    this.indexExists.mockResolvedValue(true);
  }

  mockIndexMissing(): void {
    this.indexExists.mockResolvedValue(false);
  }

  mockCreateIndexCreated(): void {
    this.createIndex.mockResolvedValue(true);
  }

  mockCreateIndexAlreadyExists(): void {
    this.createIndex.mockResolvedValue(false);
  }

  mockCreateIndexFailure(error: Error): void {
    this.createIndex.mockRejectedValue(error);
  }

  reset(): void {
    jest.clearAllMocks();
    this.mockReady();
    this.mockIndexMissing();
    this.mockCreateIndexCreated();
    this.search.mockResolvedValue({ total: 0, documents: [] });
    this.scanKeys.mockResolvedValue([]);
    this.createPipeline.mockReturnValue(null);
    this.jsonGet.mockResolvedValue(null);
    this.jsonSet.mockResolvedValue(true);
    this.del.mockResolvedValue(undefined);
    this.bumpCacheGeneration.mockResolvedValue({
      previousGeneration: 0,
      generation: 1,
    });
    this.getCacheGeneration.mockReturnValue(1);
    this.dropIndexForGeneration.mockResolvedValue(false);
    this.dropVersionedIndexesForGeneration.mockResolvedValue(undefined);
  }
}
