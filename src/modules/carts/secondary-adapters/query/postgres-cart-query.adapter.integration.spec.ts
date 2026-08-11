import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { PostgresCartQueryAdapter } from './postgres-cart-query.adapter';
import { CartEntity } from '../orm/cart.schema';
import { CartItemEntity } from '../orm/cart-item.schema';

describe('PostgresCartQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresCartQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const cartRepo = IntegrationTestHelper.getRepository(CartEntity);
    queryAdapter = new PostgresCartQueryAdapter(cartRepo);
  });

  const createCartRow = async (
    overrides: Partial<CartEntity> = {},
  ): Promise<CartEntity> => {
    const cartRepo = IntegrationTestHelper.getRepository(CartEntity);
    const itemRepo = IntegrationTestHelper.getRepository(CartItemEntity);

    const cart = await cartRepo.save(
      cartRepo.create({
        userId: seededData.customerUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      }),
    );

    await itemRepo.save(
      itemRepo.create({
        cart: cart,
        productId: seededData.product.id,
        productName: seededData.product.name,
        price: seededData.product.price,
        quantity: 2,
        imageUrl: 'https://example.com/laptop.jpg',
      }),
    );

    return cart;
  };

  it('fetches cart presentation DTO with items by user ID', async () => {
    const cart = await createCartRow();

    const result = await queryAdapter.getByUserId(seededData.customerUser.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(cart.id);
    expect(result.value?.items).toHaveLength(1);
    expect(result.value?.items[0].productName).toBe('Integration Laptop Pro');
  });

  it('returns null when querying cart for non-existent user ID', async () => {
    const result = await queryAdapter.getByUserId(99999);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).toBeNull();
  });
});
