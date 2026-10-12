import { Currency } from './currency';
import { ResultAssertionHelper } from '../../../testing';
import { DomainError } from '../exceptions/domain.error';

describe('Currency', () => {
  describe('isValid', () => {
    it.each(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'aud', 'kwd'])(
      'returns true for valid ISO currency %s',
      (code) => {
        expect(Currency.isValid(code)).toBe(true);
      },
    );

    it.each(['', 'US', 'USDD', 'XYZ', '123', '$$$'])(
      'returns false for invalid currency %s',
      (code) => {
        expect(Currency.isValid(code)).toBe(false);
      },
    );
  });

  describe('normalize', () => {
    it('normalizes valid lowercase currency to uppercase', () => {
      expect(Currency.normalize('usd')).toBe('USD');
      expect(Currency.normalize(' eur ')).toBe('EUR');
    });

    it('returns undefined for invalid currency', () => {
      expect(Currency.normalize('INVALID')).toBeUndefined();
      expect(Currency.normalize('XYZ')).toBeUndefined();
    });
  });

  describe('getExponent', () => {
    it('returns 0 for zero-decimal currencies (JPY, KRW, VND)', () => {
      expect(Currency.getExponent('JPY')).toBe(0);
      expect(Currency.getExponent('KRW')).toBe(0);
      expect(Currency.getExponent('VND')).toBe(0);
    });

    it('returns 3 for three-decimal currencies (KWD, BHD, OMR)', () => {
      expect(Currency.getExponent('KWD')).toBe(3);
      expect(Currency.getExponent('BHD')).toBe(3);
      expect(Currency.getExponent('OMR')).toBe(3);
    });

    it('returns 2 for standard currencies (USD, EUR, GBP)', () => {
      expect(Currency.getExponent('USD')).toBe(2);
      expect(Currency.getExponent('EUR')).toBe(2);
      expect(Currency.getExponent('GBP')).toBe(2);
    });
  });

  describe('create', () => {
    it('creates an immutable Currency instance for valid currencies with exponents 0, 2, and 3', () => {
      const usdResult = Currency.create('usd');
      ResultAssertionHelper.assertResultSuccess(usdResult);
      expect(usdResult.value.code).toBe('USD');
      expect(usdResult.value.exponent).toBe(2);

      const jpyResult = Currency.create('JPY');
      ResultAssertionHelper.assertResultSuccess(jpyResult);
      expect(jpyResult.value.code).toBe('JPY');
      expect(jpyResult.value.exponent).toBe(0);

      const kwdResult = Currency.create('KWD');
      ResultAssertionHelper.assertResultSuccess(kwdResult);
      expect(kwdResult.value.code).toBe('KWD');
      expect(kwdResult.value.exponent).toBe(3);
    });

    it('returns failure for invalid currency code in create', () => {
      const result = Currency.create('INVALID');
      ResultAssertionHelper.assertResultFailure(
        result,
        'Currency must be a 3-letter code (ISO 4217)',
        DomainError,
      );
    });
  });

  describe('equals', () => {
    it('returns true when currency codes match', () => {
      const first = Currency.create('USD');
      const second = Currency.create('usd');
      ResultAssertionHelper.assertResultSuccess(first);
      ResultAssertionHelper.assertResultSuccess(second);
      expect(first.value.equals(second.value)).toBe(true);
    });

    it('returns false when currency codes differ', () => {
      const usd = Currency.create('USD');
      const jpy = Currency.create('JPY');
      ResultAssertionHelper.assertResultSuccess(usd);
      ResultAssertionHelper.assertResultSuccess(jpy);
      expect(usd.value.equals(jpy.value)).toBe(false);
    });
  });
});
