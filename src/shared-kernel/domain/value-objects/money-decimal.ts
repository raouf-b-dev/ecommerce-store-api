const SCALE = 2;
const FACTOR = 100;
const INTEGER_PATTERN = /^\d+$/;
const DECIMAL_PATTERN = /^\d+\.\d{1,2}$/;

function isValidDecimalText(text: string): boolean {
  return text.includes('.')
    ? DECIMAL_PATTERN.test(text)
    : INTEGER_PATTERN.test(text);
}

/**
 * Parses a scale-2 decimal string or finite number into integer minor units.
 * "19.99" and "19.9" become 1999 and 1990. More than two fraction digits is rejected.
 */
export function minorUnitsFromDecimal(
  value: string | number,
): number | undefined {
  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    text = value.toFixed(SCALE);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return undefined;
  }

  if (!isValidDecimalText(text)) {
    return undefined;
  }

  const dot = text.indexOf('.');
  const whole = dot === -1 ? text : text.slice(0, dot);
  const fractionRaw = dot === -1 ? '' : text.slice(dot + 1);
  const fraction = fractionRaw.padEnd(SCALE, '0');
  const minor = Number(whole) * FACTOR + Number(fraction);

  if (!Number.isSafeInteger(minor) || minor < 0) {
    return undefined;
  }
  return minor;
}

/** Formats integer minor units as a scale-2 decimal string for numeric columns. */
export function decimalFromMinorUnits(minorUnits: number): string {
  const whole = Math.trunc(minorUnits / FACTOR);
  const fraction = Math.abs(minorUnits % FACTOR);
  return `${whole}.${String(fraction).padStart(SCALE, '0')}`;
}
