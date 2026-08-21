import { ProductTestFactory } from '../../../testing';
import { ProductCacheMapper } from './product.mapper';
import { Product } from '../../../core/domain/entities/product';

describe('ProductCacheMapper', () => {
  it('round-trips a factory product through JSON like Redis would', () => {
    const product = ProductTestFactory.createDomainProduct();
    const cached = JSON.parse(
      JSON.stringify(ProductCacheMapper.toCache(product)),
    );

    const decoded = ProductCacheMapper.fromCache(cached);

    expect(decoded).toBeInstanceOf(Product);
    expect(decoded?.id).toBe(product.id);
    expect(decoded?.name).toBe(product.name);
    expect(decoded?.price).toBe(product.price);
  });

  it('stores dates as epoch milliseconds', () => {
    const product = ProductTestFactory.createDomainProduct();
    const cached = ProductCacheMapper.toCache(product);

    expect(typeof cached.createdAt).toBe('number');
    expect(typeof cached.updatedAt).toBe('number');
    expect(cached.createdAt).toBe(product.createdAt.getTime());
  });

  it('returns null when domain validation rejects the payload', () => {
    expect(
      ProductCacheMapper.fromCache({
        id: 1,
        name: '',
        slug: 'x',
        price: 10,
        currency: 'USD',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ).toBeNull();
  });
});
