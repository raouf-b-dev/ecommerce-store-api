// src/testing/helpers/test-data.helper.ts
import { OrderDtoTestFactory } from '../../modules/orders/testing/factories/order-dto.factory';
import { OrderEntityTestFactory } from '../../modules/orders/testing/factories/order-entity.factory';
import { ProductEntityTestFactory } from '../../modules/products/testing/factories/product-entity.factory';

export const TEST_IDS = {
  order: 1001,
  user: 2001,
  product: 3001,
  payment: 4001,
  shippingAddress: 5001,
  cart: 6001,
  job: 'job-123',
} as const;

export class TestDataHelper {
  static createRepositoryTestData(options?: {
    orderId?: number;
    productId?: number;
  }) {
    const orderId = options?.orderId || TEST_IDS.order;
    const productId = options?.productId || TEST_IDS.product;
    const userId = TEST_IDS.user;
    const paymentId = TEST_IDS.payment;
    const shippingAddressId = TEST_IDS.shippingAddress;

    const createOrderDto = OrderDtoTestFactory.createCheckoutCommand();

    const productEntity = ProductEntityTestFactory.createProductEntity({
      id: productId,
    });

    const orderEntity = OrderEntityTestFactory.createOrderEntity({
      id: orderId,
      userId,
      paymentId,
      shippingAddressId,
      items: [
        OrderEntityTestFactory.createOrderItemEntity({
          productId,
        }),
      ],
    });

    return {
      // IDs
      orderId,
      userId,
      paymentId,
      shippingAddressId,
      productId,

      // DTOs
      createOrderDto,

      // Entities
      orderEntity,
      productEntity,

      // Individual entities
      shippingAddressEntity: orderEntity.shippingAddress,
      orderItemEntity: orderEntity.items[0],
    };
  }

  static createMultiItemTestData(itemCount: number = 3) {
    const productIds = Array.from(
      { length: itemCount },
      (_, i) => TEST_IDS.product + i,
    );

    return {
      productIds,
      createOrderDto: OrderDtoTestFactory.createCheckoutCommand(),
      productEntities:
        ProductEntityTestFactory.createProductEntities(productIds),
      orderEntity: OrderEntityTestFactory.createMultiItemOrderEntity(itemCount),
    };
  }
}
