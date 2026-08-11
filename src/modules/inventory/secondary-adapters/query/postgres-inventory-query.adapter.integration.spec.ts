import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { PostgresInventoryQueryAdapter } from './postgres-inventory-query.adapter';
import { InventoryEntity } from '../orm/inventory.schema';

describe('PostgresInventoryQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresInventoryQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const inventoryRepo = IntegrationTestHelper.getRepository(InventoryEntity);
    queryAdapter = new PostgresInventoryQueryAdapter(inventoryRepo);
  });

  it('lists inventory with product SKU and title joined in a single query', async () => {
    const result = await queryAdapter.list({ page: 1, limit: 10 });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].productId).toBe(seededData.product.id);
    expect(result.value.items[0].sku).toBe('INT-LAPTOP-01');
    expect(result.value.items[0].productTitle).toBe('Integration Laptop Pro');
    expect(result.value.items[0].availableQuantity).toBe(50);
  });

  it('fetches single inventory projection by productId', async () => {
    const result = await queryAdapter.getByProductId(seededData.product.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.productId).toBe(seededData.product.id);
    expect(result.value?.availableQuantity).toBe(50);
  });

  it('returns null when querying inventory for non-existent productId', async () => {
    const result = await queryAdapter.getByProductId(99999);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).toBeNull();
  });
});
