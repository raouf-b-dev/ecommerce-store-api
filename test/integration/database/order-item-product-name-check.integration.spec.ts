import { OrderEntityTestFactory } from 'src/modules/orders/testing';
import { OrderEntity } from 'src/modules/orders/secondary-adapters/orm/order.schema';
import { OrderItemEntity } from 'src/modules/orders/secondary-adapters/orm/order-item.schema';
import { ShippingAddressEntity } from 'src/modules/orders/secondary-adapters/orm/shipping-address.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';

describe('order_items product_name check constraint (Integration)', () => {
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();
  });

  it('rejects blank product_name and registers CHK_order_items_product_name_not_blank', async () => {
    const dataSource = IntegrationTestHelper.getDataSource();
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

    const order = await orderRepo.save(
      orderRepo.create(
        OrderEntityTestFactory.createUnsavedOrderEntity({
          userId: seededData.customerUser.id,
          shippingAddressId: shippingAddress.id,
        }),
      ),
    );

    const constraints = await dataSource.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conname = $1`,
      ['CHK_order_items_product_name_not_blank'],
    );
    expect(constraints).toEqual([
      { conname: 'CHK_order_items_product_name_not_blank' },
    ]);

    await expect(
      itemRepo.save(
        itemRepo.create(
          OrderEntityTestFactory.createUnsavedOrderItemEntity({
            order,
            productId: seededData.product.id,
            productName: '   ',
            sku: seededData.product.sku,
          }),
        ),
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'CHK_order_items_product_name_not_blank',
    });
  });
});
