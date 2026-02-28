import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisJsonClient } from '../clients/redis-json.client';
import { RedisKeyClient } from '../clients/redis-key.client';
import { RedisSearchClient } from '../clients/redis-search.client';
import { RedisService } from '../redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let jsonClient: jest.Mocked<RedisJsonClient>;
  let keyClient: jest.Mocked<RedisKeyClient>;
  let searchClient: jest.Mocked<RedisSearchClient>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisJsonClient,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            merge: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: RedisKeyClient,
          useValue: {
            ttl: jest.fn(),
            expire: jest.fn(),
            exists: jest.fn(),
            createPipeline: jest.fn(),
            scanKeys: jest.fn(),
          },
        },
        {
          provide: RedisSearchClient,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getFullKey: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    jsonClient = module.get(RedisJsonClient);
    keyClient = module.get(RedisKeyClient);
    searchClient = module.get(RedisSearchClient);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ttl', () => {
    it('should call keyClient.ttl and return the result', async () => {
      keyClient.ttl.mockResolvedValue(100);

      const result = await service.ttl('test-key');

      expect(result).toBe(100);
      expect(keyClient.ttl).toHaveBeenCalledWith('test-key');
    });
  });

  describe('get', () => {
    it('should call jsonClient.get with default path', async () => {
      const mockData = { foo: 'bar' };
      jsonClient.get.mockResolvedValue(mockData);

      const result = await service.get<{ foo: string }>('test-key');

      expect(result).toEqual(mockData);
      expect(jsonClient.get).toHaveBeenCalledWith('test-key', undefined);
    });

    it('should call jsonClient.get with custom path', async () => {
      const mockData = { foo: 'bar' };
      jsonClient.get.mockResolvedValue(mockData);

      const result = await service.get<{ foo: string }>('test-key', '$.foo');

      expect(result).toEqual(mockData);
      expect(jsonClient.get).toHaveBeenCalledWith('test-key', '$.foo');
    });

    it('should return null when no data found', async () => {
      jsonClient.get.mockResolvedValue(null);

      const result = await service.get<{ foo: string }>('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should call searchClient.search with default parameters and map values', async () => {
      const mockSearchResult = {
        documents: [
          { value: { id: 1, name: 'item1' } },
          { value: { id: 2, name: 'item2' } },
        ],
      };
      searchClient.search.mockResolvedValue(mockSearchResult);

      const result = await service.getAll<{ id: number; name: string }>(
        'test-index',
      );

      expect(result).toEqual([
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ]);
      expect(searchClient.search).toHaveBeenCalledWith('test-index', '*', {
        LIMIT: { from: 0, size: 10 },
      });
    });

    it('should handle custom search options with sorting', async () => {
      const mockSearchResult = {
        documents: [{ value: { id: 1 } }],
      };
      searchClient.search.mockResolvedValue(mockSearchResult);

      await service.getAll('test-index', 'custom-query', {
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'desc',
      });

      expect(searchClient.search).toHaveBeenCalledWith(
        'test-index',
        'custom-query',
        {
          LIMIT: { from: 5, size: 5 },
          SORTBY: { BY: 'name', DIRECTION: 'DESC' },
        },
      );
    });
  });

  describe('set', () => {
    it('should call jsonClient.set and keyClient.expire with default options', async () => {
      const testData = { test: 'data' };

      await service.set('test-key', testData);

      expect(jsonClient.set).toHaveBeenCalledWith('test-key', '$', testData, {
        nx: false,
      });
      expect(keyClient.expire).toHaveBeenCalledWith('test-key', 3600);
    });

    it('should call jsonClient.set with custom options', async () => {
      const testData = { test: 'data' };

      await service.set('test-key', testData, {
        path: '$.custom',
        ttl: 7200,
        nx: true,
      });

      expect(jsonClient.set).toHaveBeenCalledWith(
        'test-key',
        '$.custom',
        testData,
        { nx: true },
      );
      expect(keyClient.expire).toHaveBeenCalledWith('test-key', 7200);
    });
  });

  describe('setAll', () => {
    it('should pipeline set operations with default options', async () => {
      const mockPipeline = {
        json: { set: jest.fn() },
        exec: jest.fn().mockResolvedValue([]),
      };
      keyClient.createPipeline.mockReturnValue(mockPipeline as any);
      redisService.getFullKey.mockImplementation((key) => `prefix:${key}`);

      const entries = [
        { key: 'key1', value: { data: 1 } },
        { key: 'key2', value: { data: 2 } },
      ];

      await service.setAll(entries);

      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key1',
        '$',
        { data: 1 },
        'EX',
        3600,
      );
      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key2',
        '$',
        { data: 2 },
        'EX',
        3600,
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should pipeline set operations with custom options', async () => {
      const mockPipeline = {
        json: { set: jest.fn() },
        exec: jest.fn().mockResolvedValue([]),
      };
      keyClient.createPipeline.mockReturnValue(mockPipeline as any);
      redisService.getFullKey.mockImplementation((key) => `prefix:${key}`);

      const entries = [{ key: 'key1', value: { data: 1 } }];

      await service.setAll(entries, { path: '$.custom', ttl: 7200, nx: true });

      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key1',
        '$.custom',
        { data: 1 },
        'EX',
        7200,
        'NX',
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    it('should call jsonClient.merge, expire, and return updated value', async () => {
      const partialData = { name: 'updated' };
      const updatedData = { id: 1, name: 'updated' };

      jsonClient.merge.mockResolvedValue(undefined);
      keyClient.expire.mockResolvedValue(1);
      jsonClient.get.mockResolvedValue(updatedData);

      const result = await service.merge('test-key', partialData);

      expect(jsonClient.merge).toHaveBeenCalledWith(
        'test-key',
        '$',
        partialData,
      );
      expect(keyClient.expire).toHaveBeenCalledWith('test-key', 3600);
      expect(jsonClient.get).toHaveBeenCalledWith('test-key', undefined);
      expect(result).toEqual(updatedData);
    });

    it('should handle custom options', async () => {
      const partialData = { name: 'updated' };

      jsonClient.merge.mockResolvedValue(undefined);
      keyClient.expire.mockResolvedValue(1);
      jsonClient.get.mockResolvedValue({});

      await service.merge('test-key', partialData, {
        path: '$.custom',
        ttl: 7200,
      });

      expect(jsonClient.merge).toHaveBeenCalledWith(
        'test-key',
        '$.custom',
        partialData,
      );
      expect(keyClient.expire).toHaveBeenCalledWith('test-key', 7200);
    });

    it('should skip expire when ttl is 0', async () => {
      const partialData = { name: 'updated' };

      jsonClient.merge.mockResolvedValue(undefined);
      jsonClient.get.mockResolvedValue({});

      await service.merge('test-key', partialData, { ttl: 0 });

      expect(jsonClient.merge).toHaveBeenCalledWith(
        'test-key',
        '$',
        partialData,
      );
      expect(keyClient.expire).not.toHaveBeenCalled();
    });
  });

  describe('mergeAll', () => {
    it('should pipeline merge and expire operations', async () => {
      const mockPipeline = {
        json: { merge: jest.fn() },
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([]),
      };
      keyClient.createPipeline.mockReturnValue(mockPipeline as any);
      redisService.getFullKey.mockImplementation((key) => `prefix:${key}`);

      const entries = [
        { key: 'key1', value: { name: 'updated1' } },
        { key: 'key2', value: { name: 'updated2' } },
      ];

      await service.mergeAll(entries);

      expect(mockPipeline.json.merge).toHaveBeenCalledWith('prefix:key1', '$', {
        name: 'updated1',
      });
      expect(mockPipeline.json.merge).toHaveBeenCalledWith('prefix:key2', '$', {
        name: 'updated2',
      });
      expect(mockPipeline.expire).toHaveBeenCalledWith('prefix:key1', 3600);
      expect(mockPipeline.expire).toHaveBeenCalledWith('prefix:key2', 3600);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should skip expire when ttl is 0', async () => {
      const mockPipeline = {
        json: { merge: jest.fn() },
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([]),
      };
      keyClient.createPipeline.mockReturnValue(mockPipeline as any);
      redisService.getFullKey.mockImplementation((key) => `prefix:${key}`);

      const entries = [{ key: 'key1', value: { name: 'updated1' } }];

      await service.mergeAll(entries, { ttl: 0 });

      expect(mockPipeline.json.merge).toHaveBeenCalledWith('prefix:key1', '$', {
        name: 'updated1',
      });
      expect(mockPipeline.expire).not.toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should call jsonClient.del', async () => {
      await service.delete('test-key');

      expect(jsonClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deletePattern', () => {
    it('should scan for keys and delete them via pipeline', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      const mockPipeline = {
        del: jest.fn(),
        exec: jest.fn().mockResolvedValue([]),
      };

      keyClient.scanKeys.mockResolvedValue(mockKeys);
      keyClient.createPipeline.mockReturnValue(mockPipeline as any);

      await service.deletePattern('test:*');

      expect(keyClient.scanKeys).toHaveBeenCalledWith('test:*', 100);
      expect(mockPipeline.del).toHaveBeenCalledWith('key1');
      expect(mockPipeline.del).toHaveBeenCalledWith('key2');
      expect(mockPipeline.del).toHaveBeenCalledWith('key3');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should not attempt deletion when no keys found', async () => {
      keyClient.scanKeys.mockResolvedValue([]);

      await service.deletePattern('test:*');

      expect(keyClient.scanKeys).toHaveBeenCalledWith('test:*', 100);
      expect(keyClient.createPipeline).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      keyClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(keyClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      keyClient.exists.mockResolvedValue(0);

      const result = await service.exists('test-key');

      expect(result).toBe(false);
      expect(keyClient.exists).toHaveBeenCalledWith('test-key');
    });
  });

  describe('search', () => {
    it('should call searchClient.search and map values', async () => {
      const mockSearchResult = {
        documents: [
          { value: { id: 1, name: 'item1' } },
          { value: { id: 2, name: 'item2' } },
        ],
      };
      searchClient.search.mockResolvedValue(mockSearchResult);

      const result = await service.search<{ id: number; name: string }>(
        'test-index',
        'search-query',
      );

      expect(result).toEqual([
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ]);
      expect(searchClient.search).toHaveBeenCalledWith(
        'test-index',
        'search-query',
        undefined,
      );
    });

    it('should pass custom options to searchClient', async () => {
      const mockSearchResult = { documents: [] };
      const customOptions = { LIMIT: { from: 0, size: 5 } };

      searchClient.search.mockResolvedValue(mockSearchResult);

      await service.search('test-index', 'search-query', customOptions);

      expect(searchClient.search).toHaveBeenCalledWith(
        'test-index',
        'search-query',
        customOptions,
      );
    });
  });

  describe('scanKeys', () => {
    it('should call keyClient.scanKeys with default count', async () => {
      const mockKeys = ['key1', 'key2'];
      keyClient.scanKeys.mockResolvedValue(mockKeys);

      const result = await service.scanKeys('test:*');

      expect(result).toEqual(mockKeys);
      expect(keyClient.scanKeys).toHaveBeenCalledWith('test:*', 100);
    });

    it('should call keyClient.scanKeys with custom count', async () => {
      const mockKeys = ['key1', 'key2'];
      keyClient.scanKeys.mockResolvedValue(mockKeys);

      const result = await service.scanKeys('test:*', 50);

      expect(result).toEqual(mockKeys);
      expect(keyClient.scanKeys).toHaveBeenCalledWith('test:*', 50);
    });
  });
});
