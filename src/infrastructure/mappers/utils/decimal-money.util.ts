import { Currency } from '../../../shared-kernel/domain/value-objects/currency';
import { Money } from '../../../shared-kernel/domain/value-objects/money';
import { minorUnitsFromDecimal } from '../../../shared-kernel/domain/value-objects/money-decimal';

/**
 * Parses a persisted database decimal (numeric column) into integer minor units.
 * Throws in persistence adapters if stored data cannot be represented.
 */
export function requireMinorUnits(
  value: string | number,
  currency: string,
): number {
  const currencyResult = Currency.create(currency);
  if (currencyResult.isFailure) {
    throw currencyResult.error;
  }
  const minorUnits = minorUnitsFromDecimal(
    value,
    currencyResult.value.exponent,
  );
  if (minorUnits === undefined) {
    throw new Error(
      `Invalid money amount "${String(value)}" for currency "${currency}"`,
    );
  }
  return minorUnits;
}

/**
 * Converts integer minor units to a major-unit number via Money.toMajorUnits.
 * Throws in persistence/DTO adapters if the amount or currency is invalid.
 */
export function requireMajorUnitsFromMinor(
  minorUnits: number,
  currency: string,
): number {
  const moneyResult = Money.create(minorUnits, currency);
  if (moneyResult.isFailure) {
    throw moneyResult.error;
  }
  return moneyResult.value.toMajorUnits();
}
