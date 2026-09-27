import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { PostgresCategoryQueryAdapter } from './postgres-category-query.adapter';
import { CategoryEntity } from '../orm/category.schema';
import { ProductEntity } from '../orm/product.schema';

describe('PostgresCategoryQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresCategoryQueryAdapter;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    await IntegrationTestHelper.seedReferenceData();

    const categoryRepo = IntegrationTestHelper.getRepository(CategoryEntity);
    queryAdapter = new PostgresCategoryQueryAdapter(categoryRepo);
  });

  it('lists categories with active productCount in a single round-trip', async () => {
    const result = await queryAdapter.list({ isActive: true });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    // Seeded Electronics (id 1) has the integration laptop product.
    const electronics = result.value.find((c) => c.id === 1);
    expect(electronics).toBeDefined();
    expect(electronics?.productCount).toBe(1);
    expect(result.value.every((c) => typeof c.productCount === 'number')).toBe(
      true,
    );
  });

  it('returns productCount 0 for empty categories (LEFT JOIN ON, not WHERE)', async () => {
    const categoryRepo = IntegrationTestHelper.getRepository(CategoryEntity);
    const empty = await categoryRepo.save(
      categoryRepo.create({
        name: 'Empty Cat',
        slug: `empty-cat-${Date.now()}`,
        description: null,
        isActive: true,
      }),
    );

    const result = await queryAdapter.getById(empty.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;
    expect(result.value?.productCount).toBe(0);
  });

  it('ignores inactive products in productCount', async () => {
    const productRepo = IntegrationTestHelper.getRepository(ProductEntity);
    const categoryRepo = IntegrationTestHelper.getRepository(CategoryEntity);

    const category = await categoryRepo.save(
      categoryRepo.create({
        name: 'Mixed',
        slug: `mixed-${Date.now()}`,
        description: null,
        isActive: true,
      }),
    );

    await productRepo.save(
      productRepo.create({
        name: 'Active Item',
        slug: `active-item-${Date.now()}`,
        sku: `SKU-A-${Date.now()}`,
        price: 10,
        currency: 'USD',
        categoryId: category.id,
        isActive: true,
      }),
    );
    await productRepo.save(
      productRepo.create({
        name: 'Inactive Item',
        slug: `inactive-item-${Date.now()}`,
        sku: `SKU-I-${Date.now()}`,
        price: 10,
        currency: 'USD',
        categoryId: category.id,
        isActive: false,
      }),
    );

    const result = await queryAdapter.getById(category.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;
    expect(result.value?.productCount).toBe(1);
  });
});
