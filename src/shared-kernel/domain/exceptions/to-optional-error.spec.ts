import { toOptionalError } from './to-optional-error';

describe('toOptionalError', () => {
  it('returns undefined for falsy values', () => {
    expect(toOptionalError(undefined)).toBeUndefined();
    expect(toOptionalError(null)).toBeUndefined();
  });

  it('normalizes truthy values', () => {
    expect(toOptionalError('x')?.message).toBe('x');
  });

  it('returns the same Error instance', () => {
    const err = new Error('boom');
    expect(toOptionalError(err)).toBe(err);
  });
});
