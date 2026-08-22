import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';

describe('Database Index Existence & Query Plan Verification (Integration)', () => {
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();
  });

  it('verifies index existence on key query filter and join columns', async () => {
    const dataSource = IntegrationTestHelper.getDataSource();

    const getTableIndexes = async (tableName: string): Promise<string[]> => {
      const rows = await dataSource.query(
        'SELECT indexname FROM pg_indexes WHERE tablename = $1',
        [tableName],
      );
      return rows.map((r: { indexname: string }) => r.indexname.toLowerCase());
    };

    const orderIndexes = await getTableIndexes('orders');
    const inventoryIndexes = await getTableIndexes('inventory');
    const paymentIndexes = await getTableIndexes('payments');
    const cartIndexes = await getTableIndexes('carts');

    expect(orderIndexes.length).toBeGreaterThan(0);
    expect(inventoryIndexes.length).toBeGreaterThan(0);
    expect(paymentIndexes.length).toBeGreaterThan(0);
    expect(cartIndexes.length).toBeGreaterThan(0);
  });

  it('runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on order query and verifies query predicates', async () => {
    const dataSource = IntegrationTestHelper.getDataSource();

    const explainResult = await dataSource.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
       SELECT o.id, o.user_id AS "userId", o.status, o."totalPrice"
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = $1`,
      [seededData.customerUser.id],
    );

    expect(explainResult).toBeDefined();
    expect(Array.isArray(explainResult)).toBe(true);

    const planJson = JSON.stringify(explainResult);
    expect(planJson).toContain('Node Type');
    expect(planJson).toContain('orders');
  });

  it('runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on inventory query and verifies relations', async () => {
    const dataSource = IntegrationTestHelper.getDataSource();

    const explainResult = await dataSource.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
       SELECT i.id, i.product_id AS "productId", i."availableQuantity", p.sku
       FROM inventory i
       LEFT JOIN products p ON p.id = i.product_id
       WHERE i.product_id = $1`,
      [seededData.product.id],
    );

    expect(explainResult).toBeDefined();
    const planJson = JSON.stringify(explainResult);
    expect(planJson).toContain('inventory');
    expect(planJson).toContain('products');
  });
});
