import { CartTestFactory } from 'src/modules/carts/testing';
import { PostgresCartRepository } from './postgres.cart-repository';
import { CartEntity } from '../../orm/cart.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresCartRepository (Integration - Real DB)', () => {
  let repository: PostgresCartRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresCartRepository(
      dataSource.getRepository(CartEntity),
      dataSource,
    );
  });

  it('save persists a cart and findByuserId returns it', async () => {
    const cart = CartTestFactory.createEmptyCart({
      id: null,
      userId: seededData.customerUser.id,
    });

    const saveResult = await repository.save(cart);
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const found = await repository.findByuserId(seededData.customerUser.id);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value.userId).toBe(seededData.customerUser.id);
  });

  it('save rejects a second cart for the same userId', async () => {
    await repository.save(
      CartTestFactory.createEmptyCart({
        id: null,
        userId: seededData.customerUser.id,
      }),
    );

    const duplicate = await repository.save(
      CartTestFactory.createEmptyCart({
        id: null,
        userId: seededData.customerUser.id,
      }),
    );

    ResultAssertionHelper.assertResultFailure(duplicate, 'Failed to save cart');
  });

  it('save with expectedVersion persists a cart item and increments version', async () => {
    const created = await repository.save(
      CartTestFactory.createEmptyCart({
        id: null,
        userId: seededData.customerUser.id,
      }),
    );
    ResultAssertionHelper.assertResultSuccess(created);

    const forUpdate = await repository.findByIdForUpdate(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(forUpdate);
    const cart = forUpdate.value.entity;

    ResultAssertionHelper.assertResultSuccess(
      cart.addItem(
        seededData.product.id,
        seededData.product.name,
        seededData.product.price,
        2,
        seededData.product.imageUrl,
      ),
    );

    const saveResult = await repository.save(
      cart,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const loaded = await repository.findById(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value.getItems()).toHaveLength(1);
    expect(loaded.value.getItems()[0].productId).toBe(seededData.product.id);

    const after = await repository.findByIdForUpdate(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(after);
    expect(after.value.expectedVersion).toBeGreaterThan(
      forUpdate.value.expectedVersion,
    );
  });

  it('save with expectedVersion removes cart items that are no longer on the aggregate', async () => {
    const created = await repository.save(
      CartTestFactory.createEmptyCart({
        id: null,
        userId: seededData.customerUser.id,
      }),
    );
    ResultAssertionHelper.assertResultSuccess(created);

    const withItem = await repository.findByIdForUpdate(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(withItem);
    ResultAssertionHelper.assertResultSuccess(
      withItem.value.entity.addItem(
        seededData.product.id,
        seededData.product.name,
        seededData.product.price,
        1,
        seededData.product.imageUrl,
      ),
    );
    ResultAssertionHelper.assertResultSuccess(
      await repository.save(
        withItem.value.entity,
        withItem.value.expectedVersion,
      ),
    );

    const forClear = await repository.findByIdForUpdate(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(forClear);
    forClear.value.entity.clearItems();

    const cleared = await repository.save(
      forClear.value.entity,
      forClear.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(cleared);

    const loaded = await repository.findById(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value.getItems()).toHaveLength(0);
  });

  it('save with stale expectedVersion does not persist a new cart item', async () => {
    const created = await repository.save(
      CartTestFactory.createEmptyCart({
        id: null,
        userId: seededData.customerUser.id,
      }),
    );
    ResultAssertionHelper.assertResultSuccess(created);

    const forUpdate = await repository.findByIdForUpdate(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(forUpdate);
    const cart = forUpdate.value.entity;

    ResultAssertionHelper.assertResultSuccess(
      cart.addItem(
        seededData.product.id,
        seededData.product.name,
        seededData.product.price,
        1,
        seededData.product.imageUrl,
      ),
    );

    const firstSave = await repository.save(
      cart,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(firstSave);

    ResultAssertionHelper.assertResultSuccess(
      cart.addItem(
        seededData.product.id,
        seededData.product.name,
        seededData.product.price,
        1,
        seededData.product.imageUrl,
      ),
    );

    const staleSave = await repository.save(
      cart,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultFailure(
      staleSave,
      'Optimistic lock failure',
    );

    const loaded = await repository.findById(created.value.id!);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value.getItems()).toHaveLength(1);
    expect(loaded.value.getItems()[0].quantity).toBe(1);
  });
});
