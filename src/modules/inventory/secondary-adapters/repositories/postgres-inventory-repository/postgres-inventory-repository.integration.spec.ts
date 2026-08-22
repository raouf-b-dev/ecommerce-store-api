import { InventoryBuilder } from 'src/modules/inventory/testing';
import { Inventory } from '../../../core/domain/entities/inventory';
import { PostgresInventoryRepository } from './postgres-inventory-repository';
import { InventoryEntity } from '../../orm/inventory.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { InventoryCommandTestFactory } from 'src/modules/inventory/testing';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresInventoryRepository (Integration - Real DB)', () => {
  let repository: PostgresInventoryRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresInventoryRepository(
      dataSource.getRepository(InventoryEntity),
      dataSource,
    );
  });

  it('findById returns mapped inventory from database', async () => {
    const result = await repository.findById(seededData.inventory.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.productId).toBe(seededData.product.id);
    expect(result.value.availableQuantity).toBe(50);
  });

  it('findByProductId returns inventory for product FK', async () => {
    const result = await repository.findByProductId(seededData.product.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(seededData.inventory.id);
  });

  it('findLowStock returns items at or below threshold', async () => {
    const inventoryRepo = IntegrationTestHelper.getRepository(InventoryEntity);
    await inventoryRepo.update(seededData.inventory.id, {
      availableQuantity: 5,
    });

    const result = await repository.findLowStock(
      InventoryCommandTestFactory.createLowStockQuery({ threshold: 10 }),
    );

    ResultAssertionHelper.assertResultSuccess(result);
    expect(
      result.value.some((i) => i.productId === seededData.product.id),
    ).toBe(true);
  });

  it('save persists inventory changes', async () => {
    const primitives = new InventoryBuilder()
      .withId(seededData.inventory.id)
      .withProductId(seededData.product.id)
      .withAvailableQuantity(60)
      .withReservedQuantity(5)
      .withLowStockThreshold(10)
      .build();

    const domain = Inventory.fromPrimitives(primitives);
    const result = await repository.save(domain);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.availableQuantity).toBe(60);

    const row = await IntegrationTestHelper.getRepository(
      InventoryEntity,
    ).findOneBy({ id: seededData.inventory.id });
    expect(row!.availableQuantity).toBe(60);
  });

  it('save with stale expectedVersion returns optimistic lock failure', async () => {
    const forUpdate = await repository.findByIdForUpdate(
      seededData.inventory.id,
    );
    ResultAssertionHelper.assertResultSuccess(forUpdate);

    const primitives = new InventoryBuilder()
      .withId(seededData.inventory.id)
      .withProductId(seededData.product.id)
      .withAvailableQuantity(99)
      .withReservedQuantity(5)
      .withLowStockThreshold(10)
      .build();
    const domain = Inventory.fromPrimitives(primitives);

    const firstSave = await repository.save(
      domain,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(firstSave);

    const staleSave = await repository.save(
      domain,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultFailure(
      staleSave,
      'Optimistic lock failure',
    );
  });
});
