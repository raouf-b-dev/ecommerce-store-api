import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../exceptions/error-code';
import { DomainError } from '../exceptions/domain.error';
import { ResultAssertionHelper } from '../../../testing';
import { Money } from './money';

describe('Money', () => {
  it('stores an integer minor-unit amount when create succeeds', () => {
    const usdResult = Money.create(1999, 'usd');
    ResultAssertionHelper.assertResultSuccess(usdResult);
    expect(usdResult.value.amount).toBe(1999);
    expect(usdResult.value.currency).toBe('USD');

    const jpyResult = Money.create(1000, 'JPY');
    ResultAssertionHelper.assertResultSuccess(jpyResult);
    expect(jpyResult.value.amount).toBe(1000);
    expect(jpyResult.value.currency).toBe('JPY');

    const kwdResult = Money.create(1234, 'KWD');
    ResultAssertionHelper.assertResultSuccess(kwdResult);
    expect(kwdResult.value.amount).toBe(1234);
    expect(kwdResult.value.currency).toBe('KWD');
  });

  it('returns AMOUNT_INVALID when the amount is not a non-negative integer', () => {
    const result = Money.create(19.99, 'USD');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Amount must be a non-negative integer in minor units',
      DomainError,
    );
    expect(result.error.code).toBe(ErrorCode.AMOUNT_INVALID);
    expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('returns CURRENCY_INVALID when the currency is not an ISO 4217 code', () => {
    const result = Money.create(100, 'US');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Currency must be a 3-letter code (ISO 4217)',
      DomainError,
    );
    expect(result.error.code).toBe(ErrorCode.CURRENCY_INVALID);
  });

  describe('fromDecimal', () => {
    it('converts decimal inputs using the currency exponent', () => {
      const usd = Money.fromDecimal('19.99', 'USD');
      ResultAssertionHelper.assertResultSuccess(usd);
      expect(usd.value.amount).toBe(1999);

      const jpy = Money.fromDecimal('1000', 'JPY');
      ResultAssertionHelper.assertResultSuccess(jpy);
      expect(jpy.value.amount).toBe(1000);

      const kwd = Money.fromDecimal('1.234', 'KWD');
      ResultAssertionHelper.assertResultSuccess(kwd);
      expect(kwd.value.amount).toBe(1234);
    });

    it('rejects invalid decimal amount with appropriate error message', () => {
      const result = Money.fromDecimal('invalid', 'USD');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Amount must be a non-negative decimal',
        DomainError,
      );
      expect(result.error.code).toBe(ErrorCode.AMOUNT_INVALID);
    });

    it('rejects negative decimal amount in fromDecimal', () => {
      const result = Money.fromDecimal('-5.00', 'USD');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Amount must be a non-negative decimal',
        DomainError,
      );
      expect(result.error.code).toBe(ErrorCode.AMOUNT_INVALID);
    });

    it('rejects extra fraction digits beyond currency exponent', () => {
      const result = Money.fromDecimal('19.999', 'USD');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Amount must be a non-negative decimal',
        DomainError,
      );
      expect(result.error.code).toBe(ErrorCode.AMOUNT_INVALID);
    });
  });

  describe('fromMajorUnits', () => {
    it('converts major-unit numbers to minor units across exponents', () => {
      const usd = Money.fromMajorUnits(19.99, 'USD');
      ResultAssertionHelper.assertResultSuccess(usd);
      expect(usd.value.amount).toBe(1999);

      const jpy = Money.fromMajorUnits(1000, 'JPY');
      ResultAssertionHelper.assertResultSuccess(jpy);
      expect(jpy.value.amount).toBe(1000);

      const kwd = Money.fromMajorUnits(1.234, 'KWD');
      ResultAssertionHelper.assertResultSuccess(kwd);
      expect(kwd.value.amount).toBe(1234);
    });

    it('rejects negative major units in fromMajorUnits', () => {
      const result = Money.fromMajorUnits(-10, 'USD');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Amount must be a non-negative decimal',
        DomainError,
      );
      expect(result.error.code).toBe(ErrorCode.AMOUNT_INVALID);
    });

    it('rejects non-finite number in fromMajorUnits', () => {
      const result = Money.fromMajorUnits(Number.POSITIVE_INFINITY, 'USD');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Amount must be a finite number',
        DomainError,
      );
      expect(result.error.code).toBe(ErrorCode.AMOUNT_INVALID);
    });
  });

  describe('formatting', () => {
    it('formats USD (exponent 2)', () => {
      const money = Money.create(1999, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      expect(money.value.toDecimalString()).toBe('19.99');
      expect(money.value.toMajorUnits()).toBe(19.99);
    });

    it('formats JPY (exponent 0)', () => {
      const money = Money.create(1000, 'JPY');
      ResultAssertionHelper.assertResultSuccess(money);

      expect(money.value.toDecimalString()).toBe('1000');
      expect(money.value.toMajorUnits()).toBe(1000);
    });

    it('formats KWD (exponent 3)', () => {
      const money = Money.create(1234, 'KWD');
      ResultAssertionHelper.assertResultSuccess(money);

      expect(money.value.toDecimalString()).toBe('1.234');
      expect(money.value.toMajorUnits()).toBe(1.234);
    });
  });

  describe('arithmetic', () => {
    it('adds amounts in the same currency as integers', () => {
      const left = Money.create(150, 'USD');
      const right = Money.create(50, 'USD');
      ResultAssertionHelper.assertResultSuccess(left);
      ResultAssertionHelper.assertResultSuccess(right);

      const sum = left.value.add(right.value);

      ResultAssertionHelper.assertResultSuccess(sum);
      expect(sum.value.amount).toBe(200);
    });

    it('returns CURRENCY_MISMATCH when adding different currencies', () => {
      const left = Money.create(150, 'USD');
      const right = Money.create(50, 'EUR');
      ResultAssertionHelper.assertResultSuccess(left);
      ResultAssertionHelper.assertResultSuccess(right);

      const sum = left.value.add(right.value);

      ResultAssertionHelper.assertResultFailure(
        sum,
        'Cannot combine amounts in different currencies: USD and EUR',
        DomainError,
      );
      expect(sum.error.code).toBe(ErrorCode.CURRENCY_MISMATCH);
    });

    it('multiplies by an integer quantity', () => {
      const price = Money.create(1999, 'USD');
      ResultAssertionHelper.assertResultSuccess(price);

      const line = price.value.multiply(2);

      ResultAssertionHelper.assertResultSuccess(line);
      expect(line.value.amount).toBe(3998);
    });
  });
});
