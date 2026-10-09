import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../exceptions/error-code';
import { DomainError } from '../exceptions/domain.error';
import { ResultAssertionHelper } from '../../../testing';
import { Money } from './money';

describe('Money', () => {
  it('stores an integer minor-unit amount when create succeeds', () => {
    const result = Money.create(1999, 'usd');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.amount).toBe(1999);
    expect(result.value.currency).toBe('USD');
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

  it('returns CURRENCY_INVALID when the currency is not a 3-letter code', () => {
    const result = Money.create(100, 'US');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Currency must be a 3-letter code (ISO 4217)',
      DomainError,
    );
    expect(result.error.code).toBe(ErrorCode.CURRENCY_INVALID);
  });

  it('converts a scale-2 decimal into minor units', () => {
    const result = Money.fromDecimal('19.99', 'USD');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.amount).toBe(1999);
  });

  it('snaps a major-unit number to minor units', () => {
    const result = Money.fromMajorUnits(19.99, 'USD');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.amount).toBe(1999);
  });

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

  it('formats minor units to decimal string and major units number', () => {
    const moneyResult = Money.create(1999, 'USD');
    ResultAssertionHelper.assertResultSuccess(moneyResult);

    expect(moneyResult.value.toDecimalString()).toBe('19.99');
    expect(moneyResult.value.toMajorUnits()).toBe(19.99);
  });

  it('supports zero-decimal currencies like JPY', () => {
    const jpyResult = Money.fromDecimal('1000', 'JPY');
    ResultAssertionHelper.assertResultSuccess(jpyResult);
    expect(jpyResult.value.amount).toBe(1000);
    expect(jpyResult.value.currency).toBe('JPY');
    expect(jpyResult.value.toDecimalString()).toBe('1000');
    expect(jpyResult.value.toMajorUnits()).toBe(1000);

    const fromMajor = Money.fromMajorUnits(1000, 'JPY');
    ResultAssertionHelper.assertResultSuccess(fromMajor);
    expect(fromMajor.value.amount).toBe(1000);
  });

  it('supports three-decimal currencies like KWD', () => {
    const kwdResult = Money.fromDecimal('5.125', 'KWD');
    ResultAssertionHelper.assertResultSuccess(kwdResult);
    expect(kwdResult.value.amount).toBe(5125);
    expect(kwdResult.value.currency).toBe('KWD');
    expect(kwdResult.value.toDecimalString()).toBe('5.125');
    expect(kwdResult.value.toMajorUnits()).toBe(5.125);
  });
});
