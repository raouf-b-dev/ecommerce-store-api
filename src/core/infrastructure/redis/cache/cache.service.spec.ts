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

  it('ttl should call keyClient.ttl', async () => {
    keyClient.ttl.mockResolvedValue(100);
    expect(await service.ttl('key')).toBe(100);
    expect(keyClient.ttl).toHaveBeenCalledWith('key');
  });

  it('get should call jsonClient.get', async () => {
    jsonClient.get.mockResolvedValue({ foo: 'bar' });
    const result = await service.get<{ foo: string }>('key', '$');
    expect(result).toEqual({ foo: 'bar' });
    expect(jsonClient.get).toHaveBeenCalledWith('key', '$');
  });

  it('getAll should call searchClient.search and map values', async () => {
    searchClient.search.mockResolvedValue({
      documents: [{ value: { id: 1 } }, { value: { id: 2 } }],
    });
    const result = await service.getAll<any>('idx');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('set should call jsonClient.set and keyClient.expire', async () => {
    await service.set('k', { a: 1 });
    expect(jsonClient.set).toHaveBeenCalledWith('k', '$', { a: 1 });
    expect(keyClient.expire).toHaveBeenCalledWith('k', 3600);
  });

  it('setAll should pipeline set and expire', async () => {
    const execMock = jest.fn();
    const pipelineMock = {
      json: { set: jest.fn() },
      expire: jest.fn(),
      exec: execMock,
    };
    keyClient.createPipeline.mockReturnValue(pipelineMock as any);
    redisService.getFullKey.mockImplementation((k) => 'prefix:' + k);

    await service.setAll([{ key: 'a', value: 1 }]);

    expect(pipelineMock.json.set).toHaveBeenCalledWith('prefix:a', '$', 1);
    expect(pipelineMock.expire).toHaveBeenCalledWith('prefix:a', 3600);
    expect(execMock).toHaveBeenCalled();
  });

  it('merge should call jsonClient.merge, expire, and return updated value', async () => {
    jsonClient.merge.mockResolvedValue(undefined);
    keyClient.expire.mockResolvedValue(1);
    jsonClient.get.mockResolvedValue({ a: 2 });

    const result = await service.merge<{ a: number }>('k', { a: 2 });
    expect(jsonClient.merge).toHaveBeenCalledWith('k', '$', { a: 2 });
    expect(keyClient.expire).toHaveBeenCalledWith('k', 3600);
    expect(result).toEqual({ a: 2 });
  });

  it('mergeAll should pipeline merge and expire', async () => {
    const execMock = jest.fn();
    const pipelineMock = {
      json: { merge: jest.fn() },
      expire: jest.fn(),
      exec: execMock,
    };
    keyClient.createPipeline.mockReturnValue(pipelineMock as any);
    redisService.getFullKey.mockImplementation((k) => 'prefix:' + k);

    await service.mergeAll([{ key: 'a', value: { b: 1 } }]);

    expect(pipelineMock.json.merge).toHaveBeenCalledWith('prefix:a', '$', {
      b: 1,
    });
    expect(pipelineMock.expire).toHaveBeenCalledWith('prefix:a', 3600);
    expect(execMock).toHaveBeenCalled();
  });

  it('delete should call jsonClient.del', async () => {
    await service.delete('key');
    expect(jsonClient.del).toHaveBeenCalledWith('key');
  });

  it('search should call searchClient.search and map values', async () => {
    searchClient.search.mockResolvedValue({
      documents: [{ value: { x: 1 } }],
    });
    const result = await service.search<any>('idx', '*');
    expect(result).toEqual([{ x: 1 }]);
  });

  it('scanKeys should call keyClient.scanKeys', async () => {
    keyClient.scanKeys.mockResolvedValue(['k1', 'k2']);
    const result = await service.scanKeys('pattern', 50);
    expect(result).toEqual(['k1', 'k2']);
  });
});
