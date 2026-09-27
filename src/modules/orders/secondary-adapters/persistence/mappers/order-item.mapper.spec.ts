import { OrderItem } from '../../../core/domain/entities/order-items';
import { OrderItemMapper } from './order-item.mapper';

describe('OrderItemMapper', () => {
  it('toEntity omits id when domain id is null', () => {
    const item = new OrderItem({
      id: null,
      productId: 1,
      productName: 'Widget',
      unitPrice: 10,
      quantity: 2,
    });
    const entity = OrderItemMapper.toEntity(item);

    expect(entity.id).toBeUndefined();
    expect(entity.lineTotal).toBe(item.lineTotal);
  });

  it('toEntity omits id when domain id is 0', () => {
    const item = new OrderItem({
      id: 0,
      productId: 1,
      productName: 'Widget',
      unitPrice: 10,
      quantity: 1,
    });
    const entity = OrderItemMapper.toEntity(item);

    expect(entity.id).toBeUndefined();
  });
});
