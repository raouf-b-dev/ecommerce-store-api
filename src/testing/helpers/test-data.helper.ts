// src/testing/helpers/test-data.helper.ts

import { CreateOrderDtoTestFactory } from '../../modules/orders/testing/factories/create-order-dto.factory';
import { OrderEntityTestFactory } from '../../modules/orders/testing/factories/order-entity.factory';
import { ProductEntityTestFactory } from '../../modules/products/testing/factories/product-entity.factory';

/**
 * Helper class for creating consistent test data sets
 */
export class TestDataHelper {
  /**
   * Creates a complete test data set for order repository tests
   */
  static createRepositoryTestData(options?: {
    orderId?: string;
    productId?: string;
    useCOD?: boolean;
  }) {
    const orderId = options?.orderId || 'OR0000001';
    const productId = options?.productId || 'PR3';
    const customerId = 'CUST0000001';
    const paymentInfoId = 'PAY0000001';
    const shippingAddressId = 'ADDR0000001';

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
          paymentInfoId,
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
          paymentInfoId,
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
      paymentInfoId,
      shippingAddressId,
      productId,

      // DTOs
      createOrderDto,

      // Entities
      orderEntity,
      productEntity,

      // Individual entities
      customerInfoEntity: orderEntity.customerInfo,
      paymentInfoEntity: orderEntity.paymentInfo,
      shippingAddressEntity: orderEntity.shippingAddress,
      orderItemEntity: orderEntity.items[0],
    };
  }

  /**
   * Creates test data for multi-item orders
   */
  static createMultiItemTestData(itemCount: number = 3) {
    const productIds = Array.from(
      { length: itemCount },
      (_, i) => `PR${i + 1}`,
    );

    return {
      productIds,
      createOrderDto: CreateOrderDtoTestFactory.createMultiItemDto(productIds),
      productEntities:
        ProductEntityTestFactory.createProductEntities(productIds),
      orderEntity: OrderEntityTestFactory.createMultiItemOrderEntity(itemCount),
    };
  }
}
