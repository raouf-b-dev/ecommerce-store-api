import { CachedProductRepository } from './cached.product-repository';
import { PostgresProductRepository } from '../postgres-product-repository/postgres.product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { ProductCacheMapper } from '../../persistence/mappers/product.mapper';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { MockCacheService } from 'src/testing';
import { PRODUCT_REDIS } from 'src/infrastructure/redis/constants/redis.constants';
import { ResultAssertionHelper } from 'src/testing';

describe('CachedProductRepository (Integration - Real DB delegate)', () => {
  let repository: CachedProductRepository;
  let postgresRepo: PostgresProductRepository;
  let cacheService: MockCacheService;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    postgresRepo = new PostgresProductRepository(
      dataSource.getRepository(ProductEntity),
    );
    cacheService = new MockCacheService();
    repository = new CachedProductRepository(cacheService, postgresRepo);
  });

  it('loads from postgres on cache miss and populates the cache key', async () => {
    cacheService.get.mockResolvedValue(null);

    const result = await repository.findById(seededData.product.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sku).toBe('INT-LAPTOP-01');
    expect(cacheService.set).toHaveBeenCalledWith(
      `${PRODUCT_REDIS.CACHE_KEY}:${seededData.product.id}`,
      expect.any(Object),
      { ttl: PRODUCT_REDIS.EXPIRATION },
    );
  });

  it('returns the cached product on cache hit without a fresh postgres read', async () => {
    const loaded = await postgresRepo.findById(seededData.product.id);
    ResultAssertionHelper.assertResultSuccess(loaded);
    cacheService.get.mockResolvedValue({
      ...ProductCacheMapper.toCache(loaded.value),
      sku: 'FROM-CACHE',
    });

    const result = await repository.findById(seededData.product.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sku).toBe('FROM-CACHE');
    expect(cacheService.set).not.toHaveBeenCalled();
  });
});
