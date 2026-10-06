import { minorUnitsFromDecimal } from '../../../shared-kernel/domain/value-objects/money-decimal';

/**
 * Parses a persisted database decimal (numeric column) into integer minor units.
 * Throws in persistence adapters if stored data cannot be represented.
 */
export function requireMinorUnits(value: string | number): number {
  const minorUnits = minorUnitsFromDecimal(value);
  if (minorUnits === undefined) {
    throw new Error(`Invalid money amount "${String(value)}"`);
  }
  return minorUnits;
}
