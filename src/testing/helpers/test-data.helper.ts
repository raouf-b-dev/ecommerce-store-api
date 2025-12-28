// src/testing/helpers/test-data.helper.ts
import { CreateOrderDtoTestFactory } from '../../modules/orders/testing/factories/create-order-dto.factory';
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
    const customerId = 1;
    const paymentId = 1;
    const shippingAddressId = 1;

    const createOrderDto = options?.useCOD
      ? CreateOrderDtoTestFactory.createCashOnDeliveryDto()
      : CreateOrderDtoTestFactory.createCreditCardDto();

    const productEntity = ProductEntityTestFactory.createProductEntity({
      id: productId,
    });

    const orderEntity = options?.useCOD
      ? OrderEntityTestFactory.createCODOrderEntity({
          id: orderId,
          customerId,
          paymentId: null,
          shippingAddressId,
          items: [
            OrderEntityTestFactory.createOrderItemEntity({
              productId,
              product: productEntity,
            }),
          ],
        })
      : OrderEntityTestFactory.createOrderEntity({
          id: orderId,
          customerId,
          paymentId,
          shippingAddressId,
          items: [
            OrderEntityTestFactory.createOrderItemEntity({
              productId,
              product: productEntity,
            }),
          ],
        });

    return {
      // IDs
      orderId,
      customerId,
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
      createOrderDto: CreateOrderDtoTestFactory.createMultiItemDto(
        productIds.map((id) => id),
      ),
      productEntities:
        ProductEntityTestFactory.createProductEntities(productIds),
      orderEntity: OrderEntityTestFactory.createMultiItemOrderEntity(itemCount),
    };
  }
}
