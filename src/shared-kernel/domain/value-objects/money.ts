import { Result } from '../result';
import { DomainError } from '../exceptions/domain.error';
import { ErrorCode } from '../exceptions/error-code';
import { ErrorFactory } from '../exceptions/error.factory';
import { decimalFromMinorUnits, minorUnitsFromDecimal } from './money-decimal';

/**
 * Amount in integer minor units (cents for USD) plus an ISO 4217 currency code.
 * Arithmetic stays in integers.
 */
export class Money {
  private constructor(
    private readonly minorUnits: number,
    private readonly currencyCode: string,
  ) {}

  static create(
    minorUnits: number,
    currency: string,
  ): Result<Money, DomainError> {
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
      return ErrorFactory.DomainError(
        'Amount must be a non-negative integer in minor units',
        { code: ErrorCode.AMOUNT_INVALID },
      );
    }
    const normalized = normalizeCurrency(currency);
    if (normalized === undefined) {
      return ErrorFactory.DomainError(
        'Currency must be a 3-letter code (ISO 4217)',
        { code: ErrorCode.CURRENCY_INVALID },
      );
    }
    return Result.success(new Money(minorUnits, normalized));
  }

  /** Persistence boundary: a scale-2 decimal such as "19.99". */
  static fromDecimal(
    amount: string | number,
    currency: string,
  ): Result<Money, DomainError> {
    const minorUnits = minorUnitsFromDecimal(amount);
    if (minorUnits === undefined) {
      return ErrorFactory.DomainError(
        'Amount must be a non-negative scale-2 decimal',
        { code: ErrorCode.AMOUNT_INVALID },
      );
    }
    return Money.create(minorUnits, currency);
  }

  /**
   * Catalog boundary. Snaps a major-unit number to scale 2, then stores minor units.
   */
  static fromMajorUnits(
    amount: number,
    currency: string,
  ): Result<Money, DomainError> {
    if (!Number.isFinite(amount)) {
      return ErrorFactory.DomainError('Amount must be a finite number', {
        code: ErrorCode.AMOUNT_INVALID,
      });
    }
    return Money.fromDecimal(amount.toFixed(2), currency);
  }

  static zero(currency: string): Result<Money, DomainError> {
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
    return this.currencyCode;
  }

  /** Formats the minor units as a scale-2 decimal string, e.g. "19.99". */
  toDecimalString(): string {
    return decimalFromMinorUnits(this.minorUnits);
  }

  /** Converts the minor units to a major-unit number, e.g. 19.99. */
  toMajorUnits(): number {
    return Number(decimalFromMinorUnits(this.minorUnits));
  }

  add(other: Money): Result<Money, DomainError> {
    const mismatch = this.currencyMismatch(other);
    if (mismatch) {
      return mismatch;
    }
    return Money.create(this.minorUnits + other.minorUnits, this.currencyCode);
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
    return Money.create(result, this.currencyCode);
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
    return Money.create(product, this.currencyCode);
  }

  equals(other: Money): boolean {
    return (
      this.minorUnits === other.minorUnits &&
      this.currencyCode === other.currencyCode
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
    if (this.currencyCode === other.currencyCode) {
      return undefined;
    }
    return ErrorFactory.DomainError(
      `Cannot combine amounts in different currencies: ${this.currencyCode} and ${other.currencyCode}`,
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

function normalizeCurrency(currency: string): string | undefined {
  const normalized = currency?.trim().toUpperCase();
  if (!normalized || normalized.length !== 3) {
    return undefined;
  }
  return normalized;
}
