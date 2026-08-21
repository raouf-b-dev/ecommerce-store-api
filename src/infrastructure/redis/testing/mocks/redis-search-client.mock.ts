import { FtSearchOptions } from 'redis';

/**
 * Typed mock for {@link RedisSearchClient}.
 */
export class MockRedisSearchClient {
  search = jest
    .fn<
      Promise<{ total: number; documents: unknown[] }>,
      [string, string, FtSearchOptions?]
    >()
    .mockResolvedValue({ total: 0, documents: [] });

  createIndex = jest
    .fn<Promise<boolean>, [string, unknown, string]>()
    .mockResolvedValue(true);

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
    this.mockCreateIndexCreated();
    this.search.mockResolvedValue({ total: 0, documents: [] });
  }
}
