import { FtSearchOptions } from 'redis';

/**
 * Typed mock for {@link RedisService} used in unit tests.
 * Follows the project Mock* class convention (jest.fn fields + scenario helpers).
 */
export class MockRedisService {
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

  scanKeys = jest
    .fn<Promise<string[]>, [string, number?]>()
    .mockResolvedValue([]);

  createPipeline = jest.fn().mockReturnValue(null);

  getFullKey = jest
    .fn<string, [string]>()
    .mockImplementation((key: string) => `test:${key}`);

  removePrefix = jest
    .fn<string, [string]>()
    .mockImplementation((key: string) =>
      key.startsWith('test:') ? key.slice(5) : key,
    );

  jsonGet = jest.fn<Promise<unknown>, [string]>().mockResolvedValue(null);

  del = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

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
    this.del.mockResolvedValue(undefined);
  }
}
