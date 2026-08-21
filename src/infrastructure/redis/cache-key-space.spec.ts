import {
  isVersionedCacheKey,
  CACHE_GENERATION_META_KEY,
} from './cache-key-space';

describe('cache-key-space', () => {
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
});
