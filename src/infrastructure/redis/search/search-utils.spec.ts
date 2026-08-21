import {
  escapeRedisSearchTagValue,
  escapeRedisSearchTextValue,
  tagEquals,
  textEquals,
} from './search-utils';

describe('search-utils', () => {
  describe('escapeRedisSearchTextValue', () => {
    it('escapes backslash and double quote', () => {
      expect(escapeRedisSearchTextValue('a"b\\c')).toBe('a\\"b\\\\c');
    });
  });

  describe('escapeRedisSearchTagValue', () => {
    it('escapes email punctuation used in e2e fixtures', () => {
      expect(escapeRedisSearchTagValue('e2e-admin-123@example.com')).toBe(
        'e2e\\-admin\\-123\\@example\\.com',
      );
    });

    it('escapes quotes and backslashes', () => {
      expect(escapeRedisSearchTagValue('test"admin\\special@example.com')).toBe(
        'test\\"admin\\\\special\\@example\\.com',
      );
    });
  });

  describe('textEquals', () => {
    it('builds a TEXT query with escaping', () => {
      expect(textEquals('name', 'a"b')).toBe('@name:"a\\"b"');
    });
  });

  describe('tagEquals', () => {
    it('builds a TAG query with escaping', () => {
      expect(tagEquals('email', 'e2e-admin-123@example.com')).toBe(
        '@email:{e2e\\-admin\\-123\\@example\\.com}',
      );
    });
  });
});
