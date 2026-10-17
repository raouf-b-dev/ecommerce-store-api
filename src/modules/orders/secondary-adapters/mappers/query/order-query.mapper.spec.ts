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
    it('should map an OrderEntity and raw user to OrderDetailDTO', () => {
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
        imageUrl: 'https://cdn.example.com/keyboard.webp',
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

      const result = OrderQueryMapper.toDetailDto(orderEntity, user);

      expect(result.id).toBe(1);
      expect(result.orderNumber).toBe('ORD-1');
      expect(result.userName).toBe('Alice Smith');
      expect(result.userEmail).toBe('alice@example.com');
      expect(result.paymentMethod).toBe(orderEntity.paymentMethod);
      expect(result.shippingAddress).toBe('123 Tech Lane, Austin, TX 78701');
      expect(result.items.length).toBe(1);
      expect(result.items[0]).toEqual({
        productId: 5,
        sku: 'KEY-001',
        title: 'Mechanical Keyboard',
        unitPrice: 120,
        quantity: 1,
        subtotal: 120,
        imageUrl: 'https://cdn.example.com/keyboard.webp',
      });
    });

    it('returns null user and shipping fields when details are missing', () => {
      const orderEntity = OrderEntityTestFactory.createOrderEntity({
        id: 2,
        userId: 10,
        status: OrderStatus.CONFIRMED,
        shippingAddress: undefined,
        items: [
          OrderEntityTestFactory.createOrderItemEntity({
            productId: 5,
            productName: 'Mechanical Keyboard',
            sku: 'KEY-001',
            unitPrice: 120,
            quantity: 1,
            lineTotal: 120,
          }),
        ],
        totalPrice: 120,
      });

      const result = OrderQueryMapper.toDetailDto(orderEntity, null);

      expect(result.userName).toBeNull();
      expect(result.userEmail).toBeNull();
      expect(result.shippingAddress).toBeNull();
    });

    it('returns sku null from the item snapshot when sku is missing', () => {
      const item = OrderEntityTestFactory.createOrderItemEntity({
        productId: 5,
        productName: 'Mechanical Keyboard',
        sku: null,
        unitPrice: 120,
        quantity: 2,
        lineTotal: 240,
      });
      const orderEntity = OrderEntityTestFactory.createOrderEntity({
        id: 3,
        items: [item],
        totalPrice: 240,
      });

      const result = OrderQueryMapper.toDetailDto(orderEntity, null);

      expect(result.items[0]).toEqual({
        productId: 5,
        sku: null,
        title: 'Mechanical Keyboard',
        unitPrice: 120,
        quantity: 2,
        subtotal: 240,
        imageUrl: null,
      });
    });

    it('returns the item sku when present on the snapshot', () => {
      const item = OrderEntityTestFactory.createOrderItemEntity({
        productId: 5,
        productName: 'Mechanical Keyboard',
        sku: 'KEY-001',
        unitPrice: 120,
        quantity: 1,
        lineTotal: 120,
      });
      const orderEntity = OrderEntityTestFactory.createOrderEntity({
        id: 4,
        items: [item],
        totalPrice: 120,
      });

      const result = OrderQueryMapper.toDetailDto(orderEntity, null);

      expect(result.items[0].sku).toBe('KEY-001');
    });

    it('throws when productName is blank', () => {
      const item = OrderEntityTestFactory.createOrderItemEntity({
        productId: 5,
        productName: '   ',
        sku: 'KEY-001',
      });
      const orderEntity = OrderEntityTestFactory.createOrderEntity({
        id: 5,
        items: [item],
      });

      expect(() => OrderQueryMapper.toDetailDto(orderEntity, null)).toThrow(
        /missing a title/,
      );
    });
  });

  describe('toListItemDto honesty', () => {
    it('maps null user fields without inventing placeholders', () => {
      const rawRow = OrderDtoTestFactory.createRawOrderListQueryRow({
        userName: null,
        userEmail: null,
      });

      const result = OrderQueryMapper.toListItemDto(rawRow);

      expect(result.userName).toBeNull();
      expect(result.userEmail).toBeNull();
    });

    it('throws when totalAmount is missing', () => {
      const rawRow = OrderDtoTestFactory.createRawOrderListQueryRow({
        totalAmount: null,
      });

      expect(() => OrderQueryMapper.toListItemDto(rawRow)).toThrow(
        /missing a valid totalAmount/,
      );
    });
  });
});
