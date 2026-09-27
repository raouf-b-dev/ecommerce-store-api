import { parseTrustProxy } from './parse-trust-proxy';

describe('parseTrustProxy', () => {
  it('parses boolean strings', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('parses hop counts', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
  });

  it('passes through subnet strings', () => {
    expect(parseTrustProxy('loopback,127.0.0.1')).toBe('loopback,127.0.0.1');
  });
});
