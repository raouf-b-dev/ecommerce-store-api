import { CartItem } from '../../../core/domain/entities/cart-item';
import { CartItemEntity } from '../../orm/cart-item.schema';
import { CartItemMapper } from './cart-item.mapper';

describe('CartItemMapper', () => {
  it('toEntity omits id when domain id is null', () => {
    const item = CartItem.create(1, 'Widget', 9.99, 1, 'USD');
    const entity = CartItemMapper.toEntity(item);

    expect(entity.id).toBeUndefined();
    expect(entity.productId).toBe(1);
  });

  it('toEntity keeps positive id for updates', () => {
    const item = new CartItem({
      id: 42,
      productId: 1,
      productName: 'Widget',
      price: 9.99,
      currency: 'USD',
      quantity: 1,
      imageUrl: null,
    });
    const entity = CartItemMapper.toEntity(item);

    expect(entity.id).toBe(42);
  });

  it('toDomain preserves legacy id 0 from database', () => {
    const entity = Object.assign(new CartItemEntity(), {
      id: 0,
      productId: 1,
      productName: 'Widget',
      price: 9.99,
      currency: 'USD',
      quantity: 1,
      imageUrl: null,
    });

    const domain = CartItemMapper.toDomain(entity);
    expect(domain.id).toBe(0);
  });
});
