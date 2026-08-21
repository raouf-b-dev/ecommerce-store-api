import { CachePort } from '../../shared-kernel/domain/interfaces/cache.port';

/**
 * In-memory mock for {@link CachePort}.
 */
export class MockCacheService implements CachePort {
  isAvailable = jest.fn<boolean, []>().mockReturnValue(true);

  get = jest.fn().mockResolvedValue(null) as jest.MockedFunction<
    CachePort['get']
  >;
  getMany = jest.fn().mockResolvedValue([]) as jest.MockedFunction<
    CachePort['getMany']
  >;
  set = jest
    .fn<Promise<boolean>, [string, unknown, { ttl?: number; nx?: boolean }?]>()
    .mockResolvedValue(true);
  setAll = jest
    .fn<
      Promise<void>,
      [
        ReadonlyArray<{ key: string; value: unknown }>,
        { ttl?: number; nx?: boolean }?,
      ]
    >()
    .mockResolvedValue(undefined);
  delete = jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<
    CachePort['delete']
  >;
  search = jest.fn().mockResolvedValue([]) as jest.MockedFunction<
    CachePort['search']
  >;

  mockUnavailable(): void {
    this.isAvailable.mockReturnValue(false);
  }

  mockAvailable(): void {
    this.isAvailable.mockReturnValue(true);
  }
}
