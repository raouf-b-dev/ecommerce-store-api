import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { PostgresProductQueryAdapter } from './postgres-product-query.adapter';
import { ProductEntity } from '../orm/product.schema';

describe('PostgresProductQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresProductQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const productRepo = IntegrationTestHelper.getRepository(ProductEntity);
    queryAdapter = new PostgresProductQueryAdapter(productRepo);
  });

  it('lists products with category ID in single query', async () => {
    const result = await queryAdapter.list({ page: 1, limit: 10 });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].sku).toBe('INT-LAPTOP-01');
    expect(result.value.items[0].categoryId).toBe(1);
  });

  it('fetches detailed product DTO by ID', async () => {
    const result = await queryAdapter.getById(seededData.product.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(seededData.product.id);
    expect(result.value?.sku).toBe('INT-LAPTOP-01');
  });
});
