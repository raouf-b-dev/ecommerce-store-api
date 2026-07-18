// src/testing/helpers/test-data.helper.ts
import { OrderDtoTestFactory } from '../../modules/orders/testing/factories/order-dto.factory';
import { OrderEntityTestFactory } from '../../modules/orders/testing/factories/order-entity.factory';
import { ProductEntityTestFactory } from '../../modules/products/testing/factories/product-entity.factory';

export class TestDataHelper {
  static createRepositoryTestData(options?: {
    orderId?: number;
    productId?: number;
    useCOD?: boolean;
  }) {
    const orderId = options?.orderId || 1;
    const productId = options?.productId || 3;
    const userId = 1;
    const paymentId = 1;
    const shippingAddressId = 1;

    const createOrderDto = options?.useCOD
      ? OrderDtoTestFactory.createCashOnDeliveryCheckoutCommand()
      : OrderDtoTestFactory.createCreditCardCheckoutCommand();

    const productEntity = ProductEntityTestFactory.createProductEntity({
      id: productId,
    });

    const orderEntity = options?.useCOD
      ? OrderEntityTestFactory.createCODOrderEntity({
          id: orderId,
          userId,
          paymentId: null,
          shippingAddressId,
          items: [
            OrderEntityTestFactory.createOrderItemEntity({
              productId,
            }),
          ],
        })
      : OrderEntityTestFactory.createOrderEntity({
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
    const productIds = Array.from({ length: itemCount }, (_, i) => i + 1);

    return {
      productIds,
      createOrderDto: OrderDtoTestFactory.createCheckoutCommand(),
      productEntities:
        ProductEntityTestFactory.createProductEntities(productIds),
      orderEntity: OrderEntityTestFactory.createMultiItemOrderEntity(itemCount),
    };
  }
}
