const SCALE = 2;
const FACTOR = 100;

function isAllDigits(value: string): boolean {
  if (value.length === 0) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) {
      return false;
    }
  }
  return true;
}

function decimalText(value: string | number): string | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return value.toFixed(SCALE);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Parses a scale-2 decimal string into integer minor units.
 * "19.99" and "19.9" become 1999 and 1990. More than two fraction digits is rejected.
 */
export function minorUnitsFromDecimal(
  value: string | number,
): number | undefined {
  const text = decimalText(value);
  if (text === undefined) {
    return undefined;
  }
  const dot = text.indexOf('.');
  const whole = dot === -1 ? text : text.slice(0, dot);
  const fractionRaw = dot === -1 ? '' : text.slice(dot + 1);
  if (!isAllDigits(whole)) {
    return undefined;
  }
  if (dot !== -1 && !isAllDigits(fractionRaw)) {
    return undefined;
  }
  if (fractionRaw.length > SCALE) {
    return undefined;
  }
  const fraction = fractionRaw.padEnd(SCALE, '0');
  const minor = Number(whole) * FACTOR + Number(fraction);
  if (!Number.isSafeInteger(minor)) {
    return undefined;
  }
  return minor;
}

/** Minor units, or throws when the decimal cannot be represented. Adapters only. */
export function requireMinorUnits(value: string | number): number {
  const minorUnits = minorUnitsFromDecimal(value);
  if (minorUnits === undefined) {
    throw new Error(`Invalid money amount "${String(value)}"`);
  }
  return minorUnits;
}

/** Formats integer minor units as a scale-2 decimal string for numeric columns. */
export function decimalFromMinorUnits(minorUnits: number): string {
  const whole = Math.trunc(minorUnits / FACTOR);
  const fraction = Math.abs(minorUnits % FACTOR);
  return `${whole}.${String(fraction).padStart(SCALE, '0')}`;
}
