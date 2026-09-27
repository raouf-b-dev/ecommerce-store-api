import { isRedisJson, toRedisJson } from './cache-json';

describe('cache-json', () => {
  describe('isRedisJson', () => {
    it('accepts primitives, arrays, and plain objects', () => {
      expect(isRedisJson(null)).toBe(true);
      expect(isRedisJson(true)).toBe(true);
      expect(isRedisJson(1)).toBe(true);
      expect(isRedisJson('x')).toBe(true);
      expect(isRedisJson([1, { a: 'b' }])).toBe(true);
      expect(isRedisJson({ id: 1, nested: { ok: true } })).toBe(true);
    });

    it('rejects functions and symbols', () => {
      expect(isRedisJson(() => undefined)).toBe(false);
      expect(isRedisJson(Symbol('x'))).toBe(false);
    });
  });

  describe('toRedisJson', () => {
    it('round-trips plain objects without assertion casts at the call site', () => {
      const payload = { id: 1, name: 'sku', tags: ['a', 'b'], active: true };
      expect(toRedisJson(payload)).toEqual(payload);
    });

    it('strips undefined via JSON serialization', () => {
      expect(toRedisJson({ a: 1, b: undefined })).toEqual({ a: 1 });
    });
  });
});
