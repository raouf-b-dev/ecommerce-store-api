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
});
