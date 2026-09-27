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

  describe('isAvailable', () => {
    it('delegates to RedisService.isReady', () => {
      redisService.isReady.mockReturnValue(true);
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('get', () => {
    it('returns jsonGet value unwrapped', async () => {
      const mockData = { foo: 'bar' };
      redisService.jsonGet.mockResolvedValue(mockData);

      await expect(service.get('test-key')).resolves.toEqual(mockData);
      expect(redisService.jsonGet).toHaveBeenCalledWith('test-key', '$');
    });

    it('unwraps RedisJSON root arrays', async () => {
      redisService.jsonGet.mockResolvedValue([{ id: 1 }]);
      await expect(service.get('test-key')).resolves.toEqual({ id: 1 });
    });

    it('returns null when no data found', async () => {
      redisService.jsonGet.mockResolvedValue(null);
      await expect(service.get('missing')).resolves.toBeNull();
    });
  });

  describe('search', () => {
    it('maps search documents', async () => {
      redisService.search.mockResolvedValue({
        total: 2,
        documents: [
          { value: { id: 1, name: 'item1' } },
          { value: { id: 2, name: 'item2' } },
        ],
      });

      await expect(service.search('test-index')).resolves.toEqual([
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

      await service.search('test-index', 'custom-query', {
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

    it('passes custom ttl and nx', async () => {
      const testData = { test: 'data' };

      await service.set('test-key', testData, {
        ttl: 7200,
        nx: true,
      });

      expect(redisService.jsonSet).toHaveBeenCalledWith(
        'test-key',
        '$',
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
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('passes NX when requested', async () => {
      const mockPipeline = new MockRedisPipeline();
      redisService.createPipeline.mockReturnValue(mockPipeline);

      await service.setAll([{ key: 'key1', value: { data: 1 } }], {
        ttl: 7200,
        nx: true,
      });

      expect(mockPipeline.json.set).toHaveBeenCalledWith(
        'prefix:key1',
        '$',
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

  describe('delete', () => {
    it('delegates to jsonDel', async () => {
      await service.delete('test-key');
      expect(redisService.jsonDel).toHaveBeenCalledWith('test-key');
    });
  });
});
