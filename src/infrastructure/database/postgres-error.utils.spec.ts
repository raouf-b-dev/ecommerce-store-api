import { isPostgresErrorCode } from './postgres-error.utils';

describe('isPostgresErrorCode', () => {
  it('returns true when error has code directly matching target', () => {
    expect(isPostgresErrorCode({ code: '23505' }, '23505')).toBe(true);
  });

  it('returns false when error has code directly not matching target', () => {
    expect(isPostgresErrorCode({ code: '23503' }, '23505')).toBe(false);
  });

  it('returns true when driverError has matching code', () => {
    const error = {
      driverError: { code: '23505' },
    };
    expect(isPostgresErrorCode(error, '23505')).toBe(true);
  });

  it('returns false when driverError has non-matching code', () => {
    const error = {
      driverError: { code: '23503' },
    };
    expect(isPostgresErrorCode(error, '23505')).toBe(false);
  });

  it('returns false for null, undefined, primitive, or non-matching error shapes', () => {
    expect(isPostgresErrorCode(null, '23505')).toBe(false);
    expect(isPostgresErrorCode(undefined, '23505')).toBe(false);
    expect(isPostgresErrorCode('string-error', '23505')).toBe(false);
    expect(isPostgresErrorCode(12345, '23505')).toBe(false);
    expect(isPostgresErrorCode({}, '23505')).toBe(false);
    expect(isPostgresErrorCode({ code: 23505 }, '23505')).toBe(false);
    expect(isPostgresErrorCode({ driverError: null }, '23505')).toBe(false);
    expect(isPostgresErrorCode({ driverError: { code: 23505 } }, '23505')).toBe(
      false,
    );
  });
});
