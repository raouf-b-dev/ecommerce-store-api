import {
  PG_UNIQUE_VIOLATION,
  getPostgresErrorDetails,
  getPostgresError,
} from './postgres-error.utils';

describe('postgres-error.utils', () => {
  describe('PG_UNIQUE_VIOLATION', () => {
    it('is 23505', () => {
      expect(PG_UNIQUE_VIOLATION).toBe('23505');
    });
  });

  describe('getPostgresErrorDetails', () => {
    it('returns code and constraint directly present on error', () => {
      const error = {
        code: '23505',
        constraint: 'idx_payments_order_id_pending_unique',
      };

      const result = getPostgresErrorDetails(error);

      expect(result).toEqual({
        code: '23505',
        constraint: 'idx_payments_order_id_pending_unique',
      });
    });

    it('returns code and constraint from driverError envelope', () => {
      const error = {
        driverError: {
          code: '23505',
          constraint: 'idx_payments_order_id_pending_unique',
        },
      };

      const result = getPostgresErrorDetails(error);

      expect(result).toEqual({
        code: '23505',
        constraint: 'idx_payments_order_id_pending_unique',
      });
    });

    it('prefers direct properties over driverError properties when present', () => {
      const error = {
        code: '23505',
        constraint: 'direct_constraint',
        driverError: {
          code: '42P01',
          constraint: 'driver_constraint',
        },
      };

      const result = getPostgresErrorDetails(error);

      expect(result).toEqual({
        code: '23505',
        constraint: 'direct_constraint',
      });
    });

    it('falls back to driverError when direct property is not a string', () => {
      const error = {
        code: 12345,
        constraint: true,
        driverError: {
          code: '23505',
          constraint: 'idx_payments_order_id_pending_unique',
        },
      };

      const result = getPostgresErrorDetails(error);

      expect(result).toEqual({
        code: '23505',
        constraint: 'idx_payments_order_id_pending_unique',
      });
    });

    it('returns empty object for null or undefined', () => {
      expect(getPostgresErrorDetails(null)).toEqual({});
      expect(getPostgresErrorDetails(undefined)).toEqual({});
    });

    it('returns empty object for primitive values', () => {
      expect(getPostgresErrorDetails('string-error')).toEqual({});
      expect(getPostgresErrorDetails(12345)).toEqual({});
      expect(getPostgresErrorDetails(true)).toEqual({});
    });

    it('returns empty object for empty objects or non-string fields', () => {
      expect(getPostgresErrorDetails({})).toEqual({});
      expect(getPostgresErrorDetails({ code: 123 })).toEqual({});
      expect(getPostgresErrorDetails({ driverError: null })).toEqual({});
      expect(getPostgresErrorDetails({ driverError: 'not-object' })).toEqual(
        {},
      );
    });

    it('aliases getPostgresError to getPostgresErrorDetails', () => {
      expect(getPostgresError).toBe(getPostgresErrorDetails);
    });
  });
});
