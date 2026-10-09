import { Currency } from './currency';
import { ResultAssertionHelper } from '../../../testing';

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

  describe('toMinorUnits and toMajorDecimalString', () => {
    it('converts standard 2-decimal currencies', () => {
      expect(Currency.toMinorUnits(19.99, 'USD')).toBe(1999);
      expect(Currency.toMajorDecimalString(1999, 'USD')).toBe('19.99');
    });

    it('converts zero-decimal currencies like JPY', () => {
      expect(Currency.toMinorUnits(1000, 'JPY')).toBe(1000);
      expect(Currency.toMajorDecimalString(1000, 'JPY')).toBe('1000');
    });

    it('converts three-decimal currencies like KWD', () => {
      expect(Currency.toMinorUnits(5.125, 'KWD')).toBe(5125);
      expect(Currency.toMajorDecimalString(5125, 'KWD')).toBe('5.125');
    });
  });

  describe('instances and Value Object semantics', () => {
    it('creates an immutable Currency instance via create', () => {
      const result = Currency.create('usd');
      ResultAssertionHelper.assertResultSuccess(result);
      const currency = result.value;
      expect(currency.code).toBe('USD');
      expect(currency.exponent).toBe(2);
      expect(currency.factor).toBe(100);
    });

    it('returns failure for invalid currency in create', () => {
      const result = Currency.create('INVALID');
      expect(result.isFailure).toBe(true);
    });

    it('unwraps Currency via of or throws', () => {
      const jpy = Currency.of('jpy');
      expect(jpy.code).toBe('JPY');
      expect(jpy.exponent).toBe(0);
      expect(jpy.factor).toBe(1);

      expect(() => Currency.of('BAD')).toThrow();
    });

    it('checks equality by code', () => {
      const usd1 = Currency.of('USD');
      const usd2 = Currency.of('usd');
      const eur = Currency.of('EUR');

      expect(usd1.equals(usd2)).toBe(true);
      expect(usd1.equals('USD')).toBe(true);
      expect(usd1.equals('usd')).toBe(true);
      expect(usd1.equals(eur)).toBe(false);
      expect(usd1.equals('EUR')).toBe(false);
    });

    it('converts via instance methods', () => {
      const usd = Currency.of('USD');
      expect(usd.toMinorUnits(19.99)).toBe(1999);
      expect(usd.toMajorDecimalString(1999)).toBe('19.99');
      expect(usd.toMajorUnits(1999)).toBe(19.99);

      const jpy = Currency.of('JPY');
      expect(jpy.toMinorUnits(1000)).toBe(1000);
      expect(jpy.toMajorDecimalString(1000)).toBe('1000');
      expect(jpy.toMajorUnits(1000)).toBe(1000);
    });
  });
});
