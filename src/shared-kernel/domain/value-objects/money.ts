import { Result } from '../result';
import { DomainError } from '../exceptions/domain.error';
import { ErrorCode } from '../exceptions/error-code';
import { ErrorFactory } from '../exceptions/error.factory';
import { decimalFromMinorUnits, minorUnitsFromDecimal } from './money-decimal';
import { Currency } from './currency';

/**
 * Amount in integer minor units plus an ISO 4217 currency.
 * Arithmetic stays in integers.
 */
export class Money {
  private constructor(
    private readonly minorUnits: number,
    private readonly currencyObj: Currency,
  ) {}

  static create(
    minorUnits: number,
    currency: string | Currency,
  ): Result<Money, DomainError> {
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
      return ErrorFactory.DomainError(
        'Amount must be a non-negative integer in minor units',
        { code: ErrorCode.AMOUNT_INVALID },
      );
    }
    const currencyResult =
      currency instanceof Currency
        ? Result.success(currency)
        : Currency.create(currency);
    if (currencyResult.isFailure) {
      return currencyResult;
    }
    return Result.success(new Money(minorUnits, currencyResult.value));
  }

  /** Persistence boundary: a decimal string or finite number representing major units. */
  static fromDecimal(
    amount: string | number,
    currency: string | Currency,
  ): Result<Money, DomainError> {
    const currencyResult =
      currency instanceof Currency
        ? Result.success(currency)
        : Currency.create(currency);
    if (currencyResult.isFailure) {
      return currencyResult;
    }
    const curr = currencyResult.value;
    const minorUnits = minorUnitsFromDecimal(amount, curr.exponent);
    if (minorUnits === undefined) {
      return ErrorFactory.DomainError('Amount must be a non-negative decimal', {
        code: ErrorCode.AMOUNT_INVALID,
      });
    }
    return Money.create(minorUnits, curr);
  }

  /**
   * Catalog boundary. Converts a major-unit number using the currency exponent into minor units.
   */
  static fromMajorUnits(
    amount: number,
    currency: string | Currency,
  ): Result<Money, DomainError> {
    if (!Number.isFinite(amount)) {
      return ErrorFactory.DomainError('Amount must be a finite number', {
        code: ErrorCode.AMOUNT_INVALID,
      });
    }
    return Money.fromDecimal(amount, currency);
  }

  static zero(currency: string | Currency): Result<Money, DomainError> {
    return Money.create(0, currency);
  }

  /** Minor units. */
  get amount(): number {
    return this.minorUnits;
  }

  /** Minor units. */
  get value(): number {
    return this.minorUnits;
  }

  get currency(): string {
    return this.currencyObj.code;
  }

  get currencyInstance(): Currency {
    return this.currencyObj;
  }

  /** Formats the minor units as a decimal string using the currency exponent, e.g. "19.99", "1000", "1.234". */
  toDecimalString(): string {
    return decimalFromMinorUnits(this.minorUnits, this.currencyObj.exponent);
  }

  /** Converts the minor units to a major-unit number, e.g. 19.99, 1000, 1.234. */
  toMajorUnits(): number {
    return Number(
      decimalFromMinorUnits(this.minorUnits, this.currencyObj.exponent),
    );
  }

  add(other: Money): Result<Money, DomainError> {
    const mismatch = this.currencyMismatch(other);
    if (mismatch) {
      return mismatch;
    }
    return Money.create(this.minorUnits + other.minorUnits, this.currencyObj);
  }

  subtract(other: Money): Result<Money, DomainError> {
    const mismatch = this.currencyMismatch(other);
    if (mismatch) {
      return mismatch;
    }
    const result = this.minorUnits - other.minorUnits;
    if (result < 0) {
      return ErrorFactory.DomainError(
        'Cannot subtract: result would be negative',
        { code: ErrorCode.AMOUNT_INVALID },
      );
    }
    return Money.create(result, this.currencyObj);
  }

  multiply(quantity: number): Result<Money, DomainError> {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return ErrorFactory.DomainError(
        'Cannot multiply money by a negative or fractional quantity',
        { code: ErrorCode.QUANTITY_INVALID },
      );
    }
    const product = this.minorUnits * quantity;
    if (!Number.isSafeInteger(product)) {
      return ErrorFactory.DomainError('Amount is too large', {
        code: ErrorCode.AMOUNT_INVALID,
      });
    }
    return Money.create(product, this.currencyObj);
  }

  equals(other: Money): boolean {
    return (
      this.minorUnits === other.minorUnits &&
      this.currencyObj.equals(other.currencyObj)
    );
  }

  isZero(): boolean {
    return this.minorUnits === 0;
  }

  isPositive(): boolean {
    return this.minorUnits > 0;
  }

  private currencyMismatch(
    other: Money,
  ): Result<Money, DomainError> | undefined {
    if (this.currencyObj.equals(other.currencyObj)) {
      return undefined;
    }
    return ErrorFactory.DomainError(
      `Cannot combine amounts in different currencies: ${this.currency} and ${other.currency}`,
      { code: ErrorCode.CURRENCY_MISMATCH },
    );
  }

  static sum(amounts: Money[]): Result<Money, DomainError> {
    if (amounts.length === 0) {
      return ErrorFactory.DomainError('Cannot sum an empty amount list', {
        code: ErrorCode.AMOUNT_INVALID,
      });
    }

    let total = amounts[0];
    for (let index = 1; index < amounts.length; index += 1) {
      const addResult = total.add(amounts[index]);
      if (addResult.isFailure) {
        return addResult;
      }
      total = addResult.value;
    }

    return Result.success(total);
  }
}
