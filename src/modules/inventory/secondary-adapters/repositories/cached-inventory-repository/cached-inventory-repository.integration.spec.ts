import { InventoryBuilder } from 'src/modules/inventory/testing';
import { Inventory } from '../../../core/domain/entities/inventory';
import { CachedInventoryRepository } from './cached-inventory-repository';
import { PostgresInventoryRepository } from '../postgres-inventory-repository/postgres-inventory-repository';
import { InventoryEntity } from '../../orm/inventory.schema';
import {
  InventoryCacheMapper,
  InventoryForCache,
} from '../../persistence/mappers/inventory.mapper';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { MockCacheService } from 'src/testing';
import { INVENTORY_REDIS } from 'src/infrastructure/redis/constants/redis.constants';
import { ResultAssertionHelper } from 'src/testing';

describe('CachedInventoryRepository (Integration - Real DB delegate)', () => {
  let repository: CachedInventoryRepository;
  let cacheService: MockCacheService;
  let seededData: SeededData;

  const idKey = (id: number) => `${INVENTORY_REDIS.CACHE_KEY}:${id}`;
  const productKey = (productId: number) =>
    `${INVENTORY_REDIS.CACHE_KEY}:product:${productId}`;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    const postgresRepo = new PostgresInventoryRepository(
      dataSource.getRepository(InventoryEntity),
      dataSource,
    );
    cacheService = new MockCacheService();
    repository = new CachedInventoryRepository(cacheService, postgresRepo);
  });

  it('loads from postgres on cache miss and populates cache keys', async () => {
    cacheService.get.mockResolvedValue(null);

    const result = await repository.findById(seededData.inventory.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.productId).toBe(seededData.product.id);
    expect(cacheService.get).toHaveBeenCalledWith(
      idKey(seededData.inventory.id),
    );
    expect(cacheService.set).toHaveBeenCalledWith(
      idKey(seededData.inventory.id),
      expect.any(Object),
      { ttl: INVENTORY_REDIS.EXPIRATION },
    );
    expect(cacheService.set).toHaveBeenCalledWith(
      productKey(seededData.product.id),
      expect.any(Object),
      { ttl: INVENTORY_REDIS.EXPIRATION },
    );
  });

  it('returns cached value on cache hit without requiring a fresh postgres read', async () => {
    const staleCached: InventoryForCache = InventoryCacheMapper.toCache(
      Inventory.fromPrimitives(
        new InventoryBuilder()
          .withId(seededData.inventory.id)
          .withProductId(seededData.product.id)
          .withAvailableQuantity(999)
          .withReservedQuantity(0)
          .build(),
      ),
    );
    cacheService.get.mockResolvedValue(staleCached);

    const result = await repository.findById(seededData.inventory.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.availableQuantity).toBe(999);
    expect(cacheService.get).toHaveBeenCalledTimes(1);
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('writes through to postgres and refreshes cache on save', async () => {
    cacheService.get.mockResolvedValue(null);

    const primitives = new InventoryBuilder()
      .withId(seededData.inventory.id)
      .withProductId(seededData.product.id)
      .withAvailableQuantity(75)
      .withReservedQuantity(5)
      .withLowStockThreshold(10)
      .build();
    const domain = Inventory.fromPrimitives(primitives);

    const result = await repository.save(domain);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(cacheService.set).toHaveBeenCalledWith(
      idKey(seededData.inventory.id),
      expect.any(Object),
      { ttl: INVENTORY_REDIS.EXPIRATION },
    );
    expect(cacheService.delete).toHaveBeenCalledWith(
      INVENTORY_REDIS.IS_CACHED_FLAG,
    );

    const row = await IntegrationTestHelper.getRepository(
      InventoryEntity,
    ).findOneBy({ id: seededData.inventory.id });
    expect(row!.availableQuantity).toBe(75);
  });
});
