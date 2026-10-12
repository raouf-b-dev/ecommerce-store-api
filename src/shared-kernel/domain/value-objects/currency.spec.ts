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

    it('never treats an empty Intl list as valid', () => {
      Currency.resetSupportedCurrenciesCache(new Set());
      try {
        expect(Currency.isValid('USD')).toBe(false);
        expect(Currency.isValid('EUR')).toBe(false);
        expect(Currency.normalize('USD')).toBeUndefined();
      } finally {
        Currency.resetSupportedCurrenciesCache();
      }
    });
  });

  describe('normalize', () => {
    it('normalizes valid lowercase currency to uppercase', () => {
      expect(Currency.normalize('usd')).toBe('USD');
      expect(Currency.normalize(' eur ')).toBe('EUR');
    });

    it('returns undefined for invalid currency', () => {
      expect(Currency.normalize('INVALID')).toBeUndefined();
    });
  });

  describe('getExponent and getFactor', () => {
    it('returns 0 and factor 1 for zero-decimal currencies (JPY, KRW, VND)', () => {
      expect(Currency.getExponent('JPY')).toBe(0);
      expect(Currency.getFactor('JPY')).toBe(1);
      expect(Currency.getExponent('KRW')).toBe(0);
    });

    it('returns 3 and factor 1000 for three-decimal currencies (KWD, BHD)', () => {
      expect(Currency.getExponent('KWD')).toBe(3);
      expect(Currency.getFactor('KWD')).toBe(1000);
      expect(Currency.getExponent('BHD')).toBe(3);
    });

    it('returns 2 and factor 100 for standard currencies (USD, EUR, GBP)', () => {
      expect(Currency.getExponent('USD')).toBe(2);
      expect(Currency.getFactor('USD')).toBe(100);
      expect(Currency.getExponent('EUR')).toBe(2);
    });
  });

  describe('create', () => {
    it('creates an immutable Currency instance for valid 2-decimal currencies', () => {
      const result = Currency.create('usd');
      ResultAssertionHelper.assertResultSuccess(result);
      const currency = result.value;
      expect(currency.code).toBe('USD');
      expect(currency.exponent).toBe(2);
    });

    it('returns failure for invalid currency code in create', () => {
      const result = Currency.create('INVALID');
      ResultAssertionHelper.assertResultFailure(
        result,
        'Currency must be a 3-letter code (ISO 4217)',
        DomainError,
      );
    });

    it.each(['JPY', 'KRW', 'KWD', 'BHD'])(
      'rejects currency %s because minor-unit exponent is not 2',
      (code) => {
        const result = Currency.create(code);
        ResultAssertionHelper.assertResultFailure(
          result,
          'Currency must have 2 decimal places',
          DomainError,
        );
      },
    );
  });
});
