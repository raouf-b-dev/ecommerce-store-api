import {
  isVersionedCacheKey,
  CACHE_GENERATION_META_KEY,
  buildFullKey,
  buildStableFullKey,
  stripKeyPrefix,
} from './cache-key-space';

describe('cache-key-space', () => {
  const prefix = 'test:';

  it('versions domain cache, index, and list flags', () => {
    expect(isVersionedCacheKey('product_cache:1')).toBe(true);
    expect(isVersionedCacheKey('product_index')).toBe(true);
    expect(isVersionedCacheKey('product_list:isCached')).toBe(true);
    expect(isVersionedCacheKey('cart_cache:9')).toBe(true);
  });

  it('does not version idempotency or meta keys', () => {
    expect(isVersionedCacheKey('idempotency:abc')).toBe(false);
    expect(isVersionedCacheKey(CACHE_GENERATION_META_KEY)).toBe(false);
  });

  it('versions cache-aside keys for the current generation', () => {
    expect(buildFullKey(prefix, 1, 'product_cache:1')).toBe(
      'test:c1:product_cache:1',
    );
    expect(buildFullKey(prefix, 1, 'product_index')).toBe(
      'test:c1:product_index',
    );
  });

  it('keeps idempotency and meta keys on the stable prefix', () => {
    expect(buildFullKey(prefix, 1, 'idempotency:abc')).toBe(
      'test:idempotency:abc',
    );
    expect(buildStableFullKey(prefix, 'meta:cache_generation')).toBe(
      'test:meta:cache_generation',
    );
  });

  it('builds prior-generation keys for index drops', () => {
    expect(buildFullKey(prefix, 3, 'product_index')).toBe(
      'test:c3:product_index',
    );
  });

  it('strips env prefix and generation segment', () => {
    expect(stripKeyPrefix(prefix, 'test:c1:product_cache:1')).toBe(
      'product_cache:1',
    );
    expect(stripKeyPrefix(prefix, 'test:idempotency:x')).toBe('idempotency:x');
    expect(stripKeyPrefix(prefix, 'xyz')).toBe('xyz');
  });
});
