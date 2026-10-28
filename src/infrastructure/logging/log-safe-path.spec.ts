import { logSafePath } from './log-safe-path';

describe('logSafePath', () => {
  it('drops the query string', () => {
    expect(logSafePath('/api/v1/orders?userEmail=jane%40example.com')).toBe(
      '/api/v1/orders',
    );
  });

  it('keeps a path without a query string', () => {
    expect(logSafePath('/api/v1/orders/7')).toBe('/api/v1/orders/7');
  });

  it('returns an empty string for a missing url', () => {
    expect(logSafePath(undefined)).toBe('');
  });
});
