import { OrderEntityTestFactory } from 'src/modules/orders/testing';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { PostgresOrderQueryAdapter } from './postgres-order-query.adapter';
import { OrderEntity } from '../orm/order.schema';
import { OrderItemEntity } from '../orm/order-item.schema';
import { ShippingAddressEntity } from '../orm/shipping-address.schema';

describe('PostgresOrderQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresOrderQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const orderRepo = IntegrationTestHelper.getRepository(OrderEntity);
    queryAdapter = new PostgresOrderQueryAdapter(orderRepo);
  });

  const createOrderRow = async (
    overrides: Partial<OrderEntity> = {},
  ): Promise<OrderEntity> => {
    const orderRepo = IntegrationTestHelper.getRepository(OrderEntity);
    const itemRepo = IntegrationTestHelper.getRepository(OrderItemEntity);
    const shippingAddressRepo = IntegrationTestHelper.getRepository(
      ShippingAddressEntity,
    );
    const shippingAddress = await shippingAddressRepo.save(
      shippingAddressRepo.create(
        OrderEntityTestFactory.createShippingAddressEntity({ id: undefined }),
      ),
    );

    const unsavedOrder = OrderEntityTestFactory.createUnsavedOrderEntity({
      userId: seededData.customerUser.id,
      shippingAddressId: shippingAddress.id,
      totalPrice: 1200.0,
      ...overrides,
    });
    const order = await orderRepo.save(orderRepo.create(unsavedOrder));

    const unsavedItem = OrderEntityTestFactory.createUnsavedOrderItemEntity({
      order: order,
      productId: seededData.product.id,
      productName: seededData.product.name,
      sku: seededData.product.sku,
      quantity: 1,
      unitPrice: 1200.0,
      lineTotal: 1200.0,
    });
    await itemRepo.save(itemRepo.create(unsavedItem));

    return order;
  };

  it('lists orders with pagination and resolved customer name in a single query', async () => {
    await createOrderRow();
    await createOrderRow();

    const result = await queryAdapter.list({ page: 1, limit: 10 });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(2);
    expect(result.value.items).toHaveLength(2);
    expect(result.value.items[0].userName).toBe('Customer One');
    expect(result.value.items[0].itemCount).toBe(1);
  });

  it('filters orders by authorizedUserId ownership scope', async () => {
    const order = await createOrderRow({ userId: seededData.customerUser.id });
    await createOrderRow({ userId: seededData.adminUser.id });

    const result = await queryAdapter.list({
      page: 1,
      limit: 10,
      authorizedUserId: seededData.customerUser.id,
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].id).toBe(order.id);
    expect(result.value.items[0].userId).toBe(seededData.customerUser.id);
  });

  it('returns order detail DTO with line items and product SKU mapping', async () => {
    const order = await createOrderRow();

    const result = await queryAdapter.getById(order.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(order.id);
    expect(result.value?.userName).toBe('Customer One');
    expect(result.value?.items[0].sku).toBe('INT-LAPTOP-01');
  });

  it('returns QueryNotFoundError when querying non-existent order ID', async () => {
    const result = await queryAdapter.getById(99999);

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('returns error when user ID ownership does not match order ID', async () => {
    const order = await createOrderRow({ userId: seededData.customerUser.id });

    const result = await queryAdapter.getById(
      order.id,
      seededData.adminUser.id,
    );

    expect(result.isFailure).toBe(true);
  });
});
