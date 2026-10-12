const NON_ZERO_DIGIT_PATTERN = /[^0]/;
const DIGITS_ONLY_PATTERN = /^\d+$/;

function isPositiveDecimalText(text: string): boolean {
  if (text.length === 0) {
    return false;
  }
  const parts = text.split('.');
  if (parts.length === 1) {
    return DIGITS_ONLY_PATTERN.test(parts[0]);
  }
  if (parts.length === 2) {
    return (
      DIGITS_ONLY_PATTERN.test(parts[0]) && DIGITS_ONLY_PATTERN.test(parts[1])
    );
  }
  return false;
}

function isValidExponent(exponent: number): boolean {
  return Number.isInteger(exponent) && exponent >= 0 && exponent <= 3;
}

/**
 * Parses a decimal string or finite number into integer minor units using the given currency exponent (0..3).
 * Extra fraction digits are allowed only if they are trailing zeros (e.g. "19.990" with exponent 2 yields 1999).
 * Non-zero extra fraction digits (e.g. "1.2345" with exponent 2) are rejected (returns undefined).
 */
export function minorUnitsFromDecimal(
  value: string | number,
  exponent: number,
): number | undefined {
  if (!isValidExponent(exponent)) {
    return undefined;
  }

  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return undefined;
  }

  if (!isPositiveDecimalText(text)) {
    return undefined;
  }

  const dot = text.indexOf('.');
  const whole = dot === -1 ? text : text.slice(0, dot);
  const fraction = dot === -1 ? '' : text.slice(dot + 1);

  let effectiveFraction: string;
  if (fraction.length > exponent) {
    const extra = fraction.slice(exponent);
    if (NON_ZERO_DIGIT_PATTERN.test(extra)) {
      return undefined;
    }
    effectiveFraction = fraction.slice(0, exponent);
  } else {
    effectiveFraction = fraction.padEnd(exponent, '0');
  }

  const wholeNumber = Number(whole);
  const factor = Math.pow(10, exponent);
  const fractionNumber = exponent === 0 ? 0 : Number(effectiveFraction);
  const minor = wholeNumber * factor + fractionNumber;

  if (!Number.isSafeInteger(minor) || minor < 0) {
    return undefined;
  }
  return minor;
}

/**
 * Formats integer minor units as a decimal string for numeric columns using the given currency exponent (0..3).
 * Exponent 0 produces integer strings (e.g. "1000").
 * Exponents 1..3 produce fixed decimal strings (e.g. "19.99" for 2, "1.234" for 3).
 */
export function decimalFromMinorUnits(
  minorUnits: number,
  exponent: number,
): string {
  if (!isValidExponent(exponent)) {
    throw new Error(
      `Invalid currency exponent ${exponent}: must be between 0 and 3`,
    );
  }

  if (exponent === 0) {
    return String(Math.trunc(minorUnits));
  }

  const factor = Math.pow(10, exponent);
  const whole = Math.trunc(minorUnits / factor);
  const fraction = Math.abs(minorUnits % factor);
  return `${whole}.${String(fraction).padStart(exponent, '0')}`;
}
