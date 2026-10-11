import {
  PG_UNIQUE_VIOLATION,
  getPostgresConstraint,
  isPostgresErrorCode,
} from './postgres-error.utils';

describe('postgres-error.utils', () => {
  describe('PG_UNIQUE_VIOLATION', () => {
    it('is 23505', () => {
      expect(PG_UNIQUE_VIOLATION).toBe('23505');
    });
  });

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
      expect(
        isPostgresErrorCode({ driverError: { code: 23505 } }, '23505'),
      ).toBe(false);
    });
  });

  describe('getPostgresConstraint', () => {
    it('returns constraint name directly present on error', () => {
      expect(
        getPostgresConstraint({
          constraint: 'idx_payments_order_id_pending_unique',
        }),
      ).toBe('idx_payments_order_id_pending_unique');
    });

    it('returns constraint name from driverError envelope', () => {
      expect(
        getPostgresConstraint({
          driverError: {
            constraint: 'idx_payments_order_id_pending_unique',
          },
        }),
      ).toBe('idx_payments_order_id_pending_unique');
    });

    it('returns undefined when constraint is missing or non-string', () => {
      expect(getPostgresConstraint(null)).toBeUndefined();
      expect(getPostgresConstraint(undefined)).toBeUndefined();
      expect(getPostgresConstraint('string-error')).toBeUndefined();
      expect(getPostgresConstraint({})).toBeUndefined();
      expect(getPostgresConstraint({ constraint: 123 })).toBeUndefined();
      expect(getPostgresConstraint({ driverError: null })).toBeUndefined();
      expect(
        getPostgresConstraint({ driverError: { constraint: true } }),
      ).toBeUndefined();
    });
  });
});
