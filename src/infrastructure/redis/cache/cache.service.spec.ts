import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../redis.service';
import { MockRedisPipeline } from '../../../testing';
import { MockRedisService } from '../testing';

describe('CacheService', () => {
  let service: CacheService;
  let redisService: MockRedisService;

  beforeEach(async () => {
    redisService = new MockRedisService();
    redisService.getFullKey.mockImplementation((key) => `prefix:${key}`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ttl', () => {
    it('delegates to RedisService.ttl', async () => {
      redisService.ttl.mockResolvedValue(100);

      await expect(service.ttl('test-key')).resolves.toBe(100);
      expect(redisService.ttl).toHaveBeenCalledWith('test-key');
    });
  });

  describe('get', () => {
    it('returns jsonGet value', async () => {
      const mockData = { foo: 'bar' };
      redisService.jsonGet.mockResolvedValue(mockData);

      await expect(service.get<{ foo: string }>('test-key')).resolves.toEqual(
        mockData,
      );
      expect(redisService.jsonGet).toHaveBeenCalledWith('test-key', undefined);
    });

    it('returns null when no data found', async () => {
      redisService.jsonGet.mockResolvedValue(null);

      await expect(service.get('missing')).resolves.toBeNull();
    });
  });

  describe('getAll', () => {
    it('maps search documents', async () => {
      redisService.search.mockResolvedValue({
        total: 2,
        documents: [
          { value: { id: 1, name: 'item1' } },
          { value: { id: 2, name: 'item2' } },
        ],
      });

      await expect(
        service.getAll<{ id: number; name: string }>('test-index'),
      ).resolves.toEqual([
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ]);
      expect(redisService.search).toHaveBeenCalledWith('test-index', '*', {
        LIMIT: { from: 0, size: 10 },
      });
    });

    it('passes sort options', async () => {
      redisService.search.mockResolvedValue({
        total: 1,
        documents: [{ value: { id: 1 } }],
      });

      await service.getAll('test-index', 'custom-query', {
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'desc',
      });

      expect(redisService.search).toHaveBeenCalledWith(
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
    it('uses atomic jsonSet with default ttl', async () => {
      const testData = { test: 'data' };

      await service.set('test-key', testData);

      expect(redisService.jsonSet).toHaveBeenCalledWith(
        'test-key',
        '$',
        testData,
        { nx: false, ttl: 3600 },
      );
    });

    it('passes custom options', async () => {
      const testData = { test: 'data' };

      await service.set('test-key', testData, {
        path: '$.custom',
        ttl: 7200,
        nx: true,
      });

      expect(redisService.jsonSet).toHaveBeenCalledWith(
        'test-key',
        '$.custom',
        testData,
        { nx: true, ttl: 7200 },
      );
    });
  });

  describe('setAll', () => {
    it('pipelines set + expire atomically per key', async () => {
      const mockPipeline = new MockRedisPipeline();
      redisService.createPipeline.mockReturnValue(mockPipeline);

      await service.setAll([
        { key: 'key1', value: { data: 1 } },
        { key: 'key2', value: { data: 2 } },
      ]);

      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key1',
        '$',
        { data: 1 },
        {},
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith('prefix:key1', 3600);
      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key2',
        '$',
        { data: 2 },
        {},
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith('prefix:key2', 3600);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('passes NX when requested', async () => {
      const mockPipeline = new MockRedisPipeline();
      redisService.createPipeline.mockReturnValue(mockPipeline);

      await service.setAll([{ key: 'key1', value: { data: 1 } }], {
        path: '$.custom',
        ttl: 7200,
        nx: true,
      });

      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key1',
        '$.custom',
        { data: 1 },
        { NX: true },
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith('prefix:key1', 7200);
    });

    it('does not throw when pipeline is unavailable', async () => {
      redisService.createPipeline.mockReturnValue(null);

      await expect(
        service.setAll([{ key: 'key1', value: { data: 1 } }]),
      ).resolves.toBeUndefined();
    });
  });

  describe('merge', () => {
    it('merges with ttl and returns updated value', async () => {
      const partialData = { name: 'updated' };
      const updatedData = { id: 1, name: 'updated' };
      redisService.jsonGet.mockResolvedValue(updatedData);

      const result = await service.merge('test-key', partialData);

      expect(redisService.jsonMerge).toHaveBeenCalledWith(
        'test-key',
        '$',
        partialData,
        { ttl: 3600 },
      );
      expect(result).toEqual(updatedData);
    });

    it('skips ttl when 0', async () => {
      redisService.jsonGet.mockResolvedValue({});

      await service.merge('test-key', { name: 'x' }, { ttl: 0 });

      expect(redisService.jsonMerge).toHaveBeenCalledWith(
        'test-key',
        '$',
        { name: 'x' },
        { ttl: undefined },
      );
    });
  });

  describe('delete', () => {
    it('delegates to jsonDel', async () => {
      await service.delete('test-key');
      expect(redisService.jsonDel).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deletePattern', () => {
    it('scans and deletes via pipeline', async () => {
      redisService.scanKeys.mockResolvedValue(['key1', 'key2']);
      const mockPipeline = new MockRedisPipeline();
      redisService.createPipeline.mockReturnValue(mockPipeline);

      await service.deletePattern('test:*');

      expect(redisService.scanKeys).toHaveBeenCalledWith('test:*', 100);
      expect(mockPipeline.del).toHaveBeenCalledWith('prefix:key1');
      expect(mockPipeline.del).toHaveBeenCalledWith('prefix:key2');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('skips when no keys', async () => {
      redisService.scanKeys.mockResolvedValue([]);

      await service.deletePattern('test:*');

      expect(redisService.createPipeline).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('returns true when key exists', async () => {
      redisService.exists.mockResolvedValue(1);
      await expect(service.exists('test-key')).resolves.toBe(true);
    });

    it('returns false when key does not exist', async () => {
      redisService.exists.mockResolvedValue(0);
      await expect(service.exists('test-key')).resolves.toBe(false);
    });
  });

  describe('search', () => {
    it('maps search documents', async () => {
      redisService.search.mockResolvedValue({
        total: 1,
        documents: [{ value: { id: 1, name: 'item1' } }],
      });

      await expect(
        service.search<{ id: number; name: string }>(
          'test-index',
          'search-query',
        ),
      ).resolves.toEqual([{ id: 1, name: 'item1' }]);
    });
  });

  describe('scanKeys', () => {
    it('delegates to RedisService', async () => {
      redisService.scanKeys.mockResolvedValue(['key1']);
      await expect(service.scanKeys('test:*', 50)).resolves.toEqual(['key1']);
      expect(redisService.scanKeys).toHaveBeenCalledWith('test:*', 50);
    });
  });
});
