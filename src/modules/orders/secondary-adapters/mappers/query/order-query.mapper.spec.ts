import { OrderQueryMapper } from './order-query.mapper';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import {
  OrderDtoTestFactory,
  OrderEntityTestFactory,
} from 'src/modules/orders/testing';

describe('OrderQueryMapper', () => {
  describe('toListItemDto', () => {
    it('should map a raw database row to OrderListItemDTO', () => {
      const rawRow = OrderDtoTestFactory.createRawOrderListQueryRow();

      const result = OrderQueryMapper.toListItemDto(rawRow);

      expect(result).toEqual(
        OrderDtoTestFactory.createOrderListItemDTO({
          id: 42,
          orderNumber: 'ORD-42',
          userId: 10,
          userName: 'Alice Smith',
          userEmail: 'alice@example.com',
          status: 'PENDING_PAYMENT',
          itemCount: 3,
          totalAmount: 199.99,
        }),
      );
    });
  });

  describe('toDetailDto', () => {
    it('should map an OrderEntity, raw user, and productMap to OrderDetailDTO', () => {
      const shippingAddress =
        OrderEntityTestFactory.createShippingAddressEntity({
          street: '123 Tech Lane',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
        });

      const item = OrderEntityTestFactory.createOrderItemEntity({
        productId: 5,
        productName: 'Mechanical Keyboard',
        sku: 'KEY-001',
        unitPrice: 120,
        quantity: 1,
        lineTotal: 120,
      });

      const orderEntity = OrderEntityTestFactory.createOrderEntity({
        id: 1,
        userId: 10,
        status: OrderStatus.CONFIRMED,
        shippingAddress,
        items: [item],
        totalPrice: 120,
        createdAt: new Date('2026-08-09T20:00:00.000Z'),
        updatedAt: new Date('2026-08-09T20:00:00.000Z'),
      });

      const user = OrderDtoTestFactory.createOrderDetailUserInfo();

      const productMap = new Map([
        [5, { sku: 'KEY-001', title: 'Mechanical Keyboard' }],
      ]);

      const result = OrderQueryMapper.toDetailDto(
        orderEntity,
        user,
        productMap,
      );

      expect(result.id).toBe(1);
      expect(result.orderNumber).toBe('ORD-1');
      expect(result.userName).toBe('Alice Smith');
      expect(result.userEmail).toBe('alice@example.com');
      expect(result.shippingAddress).toBe('123 Tech Lane, Austin, TX 78701');
      expect(result.items.length).toBe(1);
      expect(result.items[0]).toEqual({
        productId: 5,
        sku: 'KEY-001',
        title: 'Mechanical Keyboard',
        unitPrice: 120,
        quantity: 1,
        subtotal: 120,
      });
    });
  });
});
