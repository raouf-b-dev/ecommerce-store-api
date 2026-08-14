import { ProductTestFactory } from 'src/modules/products/testing';
import { PostgresProductRepository } from './postgres.product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresProductRepository (Integration - Real DB)', () => {
  let repository: PostgresProductRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresProductRepository(
      dataSource.getRepository(ProductEntity),
    );
  });

  it('findById returns product mapped from database', async () => {
    const result = await repository.findById(seededData.product.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.sku).toBe('INT-LAPTOP-01');
    expect(result.value.name).toBe('Integration Laptop Pro');
  });

  it('findByIdForUpdate returns expectedVersion from database row', async () => {
    const result = await repository.findByIdForUpdate(seededData.product.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.entity.id).toBe(seededData.product.id);
    expect(result.value.expectedVersion).toBeGreaterThanOrEqual(1);
  });

  it('save persists product changes', async () => {
    const forUpdate = await repository.findByIdForUpdate(seededData.product.id);
    ResultAssertionHelper.assertResultSuccess(forUpdate);

    const product = forUpdate.value.entity;
    ResultAssertionHelper.assertResultSuccess(product.updatePrice(1500));

    const result = await repository.save(
      product,
      forUpdate.value.expectedVersion,
    );

    ResultAssertionHelper.assertResultSuccess(result);

    const row = await IntegrationTestHelper.getRepository(
      ProductEntity,
    ).findOneBy({ id: seededData.product.id });
    expect(Number(row!.price)).toBe(1500);
  });

  it('save increments the version column after a successful update', async () => {
    const before = await repository.findByIdForUpdate(seededData.product.id);
    ResultAssertionHelper.assertResultSuccess(before);

    const product = before.value.entity;
    ResultAssertionHelper.assertResultSuccess(product.updatePrice(1600));

    const saveResult = await repository.save(
      product,
      before.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const after = await repository.findByIdForUpdate(seededData.product.id);
    ResultAssertionHelper.assertResultSuccess(after);
    expect(after.value.expectedVersion).toBeGreaterThan(
      before.value.expectedVersion,
    );
    expect(after.value.entity.price).toBe(1600);
  });

  it('creates new product via save when id is unset', async () => {
    const product = ProductTestFactory.createDomainProduct({
      id: null,
      sku: 'INT-NEW-PRODUCT',
      slug: 'int-new-product',
      name: 'Integration New Product',
    });

    const result = await repository.save(product);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBeDefined();

    const count = await IntegrationTestHelper.getRepository(
      ProductEntity,
    ).count({
      where: { sku: 'INT-NEW-PRODUCT' },
    });
    expect(count).toBe(1);
  });
});
