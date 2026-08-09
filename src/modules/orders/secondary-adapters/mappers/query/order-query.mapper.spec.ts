import { OrderQueryMapper } from './order-query.mapper';
import { OrderEntity } from '../../orm/order.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ShippingAddressEntity } from '../../orm/shipping-address.schema';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';

describe('OrderQueryMapper', () => {
  describe('toListItemDto', () => {
    it('should map a raw database row to OrderListItemDTO', () => {
      const rawRow = {
        id: '42',
        userId: '10',
        userName: 'Alice Smith',
        userEmail: 'alice@example.com',
        status: 'PENDING_PAYMENT',
        itemCount: '3',
        totalAmount: '199.99',
        createdAt: '2026-08-09T20:00:00.000Z',
      };

      const result = OrderQueryMapper.toListItemDto(rawRow);

      expect(result).toEqual({
        id: 42,
        orderNumber: 'ORD-42',
        userId: 10,
        userName: 'Alice Smith',
        userEmail: 'alice@example.com',
        status: 'PENDING_PAYMENT',
        itemCount: 3,
        totalAmount: 199.99,
        currency: 'USD',
        createdAt: new Date('2026-08-09T20:00:00.000Z'),
      });
    });
  });

  describe('toDetailDto', () => {
    it('should map an OrderEntity, raw user, and productMap to OrderDetailDTO', () => {
      const shippingAddress = new ShippingAddressEntity();
      shippingAddress.street = '123 Tech Lane';
      shippingAddress.city = 'Austin';
      shippingAddress.state = 'TX';
      shippingAddress.postalCode = '78701';

      const item = new OrderItemEntity();
      item.productId = 5;
      item.productName = 'Mechanical Keyboard';
      item.sku = 'KEY-001';
      item.unitPrice = 120;
      item.quantity = 1;
      item.lineTotal = 120;

      const orderEntity = new OrderEntity();
      orderEntity.id = 1;
      orderEntity.userId = 10;
      orderEntity.status = OrderStatus.CONFIRMED;
      orderEntity.shippingAddress = shippingAddress;
      orderEntity.items = [item];
      orderEntity.totalPrice = 120;
      orderEntity.createdAt = new Date('2026-08-09T20:00:00.000Z');
      orderEntity.updatedAt = new Date('2026-08-09T20:00:00.000Z');

      const user = {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      };

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
