import { OrderEntityTestFactory } from '../../../testing';
import { OrderItem } from '../../../core/domain/entities/order-items';
import { OrderItemMapper } from './order-item.mapper';

describe('OrderItemMapper', () => {
  it('toDomain keeps the stored productName unchanged', () => {
    const entity = OrderEntityTestFactory.createOrderItemEntity({
      productName: 'Mechanical Keyboard',
    });

    const domain = OrderItemMapper.toDomain(entity);

    expect(domain.productName).toBe('Mechanical Keyboard');
  });

  it('toEntity omits id when domain id is null', () => {
    const item = new OrderItem({
      id: null,
      productId: 1,
      productName: 'Widget',
      unitPrice: 10,
      quantity: 2,
      currency: 'USD',
    });
    const entity = OrderItemMapper.toEntity(item);

    expect(entity.id).toBeUndefined();
    expect(entity.unitPrice).toBe(0.1);
    expect(entity.lineTotal).toBe(0.2);
    expect(entity.currency).toBe('USD');
  });

  it('reloads the currency stored on the line', () => {
    const item = new OrderItem({
      id: 4,
      productId: 1,
      productName: 'Widget',
      unitPrice: 1999,
      quantity: 1,
      currency: 'EUR',
    });
    const entity = OrderItemMapper.toEntity(item);
    const reloaded = OrderItemMapper.toDomain(entity);

    expect(reloaded.toPrimitives().currency).toBe('EUR');
  });

  it('toEntity omits id when domain id is 0', () => {
    const item = new OrderItem({
      id: 0,
      productId: 1,
      productName: 'Widget',
      unitPrice: 10,
      quantity: 1,
      currency: 'USD',
    });
    const entity = OrderItemMapper.toEntity(item);

    expect(entity.id).toBeUndefined();
  });

  it('round-trips zero-decimal JPY 1000 correctly', () => {
    const item = new OrderItem({
      id: 1,
      productId: 10,
      productName: 'Matcha',
      unitPrice: 1000,
      quantity: 2,
      currency: 'JPY',
    });
    const entity = OrderItemMapper.toEntity(item);
    expect(entity.unitPrice).toBe(1000);
    expect(entity.lineTotal).toBe(2000);

    const reloaded = OrderItemMapper.toDomain(entity);
    expect(reloaded.toPrimitives().unitPrice).toBe(1000);
    expect(reloaded.toPrimitives().lineTotal).toBe(2000);
    expect(reloaded.toPrimitives().currency).toBe('JPY');
  });

  it('round-trips three-decimal KWD 1.234 correctly', () => {
    const item = new OrderItem({
      id: 2,
      productId: 20,
      productName: 'Oud',
      unitPrice: 1234,
      quantity: 1,
      currency: 'KWD',
    });
    const entity = OrderItemMapper.toEntity(item);
    expect(entity.unitPrice).toBe(1.234);
    expect(entity.lineTotal).toBe(1.234);

    const reloaded = OrderItemMapper.toDomain(entity);
    expect(reloaded.toPrimitives().unitPrice).toBe(1234);
    expect(reloaded.toPrimitives().lineTotal).toBe(1234);
    expect(reloaded.toPrimitives().currency).toBe('KWD');
  });
});
