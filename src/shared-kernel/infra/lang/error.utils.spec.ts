import { toError, toErrorMessage, toOptionalError } from './error.utils';

describe('error.utils', () => {
  describe('toErrorMessage', () => {
    it('returns message from Error', () => {
      expect(toErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('returns string values as-is', () => {
      expect(toErrorMessage('plain')).toBe('plain');
    });

    it('stringifies primitives safely', () => {
      expect(toErrorMessage(404)).toBe('404');
    });

    it('reads message property from plain objects', () => {
      expect(toErrorMessage({ message: 'from object' })).toBe('from object');
    });

    it('falls back for unhelpful objects', () => {
      expect(toErrorMessage({ code: 'ERR' })).toBe('Unknown error');
    });
  });

  describe('toError', () => {
    it('returns the same Error instance', () => {
      const err = new Error('x');
      expect(toError(err)).toBe(err);
    });

    it('wraps non-Error values', () => {
      expect(toError('fail').message).toBe('fail');
    });

    it('preserves cause when wrapping non-Error values', () => {
      const cause = { code: 'ERR' };
      const err = toError(cause);
      expect(err.message).toBe('Unknown error');
      expect(err.cause).toBe(cause);
    });

    it('preserves string cause', () => {
      const err = toError('fail');
      expect(err.cause).toBe('fail');
    });

    it('does not set cause for undefined', () => {
      const err = toError(undefined);
      expect(err.message).toBe('Unknown error');
      expect(err.cause).toBeUndefined();
    });
  });

  describe('toOptionalError', () => {
    it('returns undefined for falsy values', () => {
      expect(toOptionalError(undefined)).toBeUndefined();
      expect(toOptionalError(null)).toBeUndefined();
    });

    it('normalizes truthy values', () => {
      expect(toOptionalError('x')?.message).toBe('x');
    });
  });
});
