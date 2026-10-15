import { CurrencyExponent } from './currency';

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

/**
 * V8 uses exponent notation for |n| < 1e-6 and |n| >= 1e21.
 * Money parsing must see ordinary decimal text, not "1e-7".
 */
function numberToPlainDecimalText(value: number): string {
  const raw = String(value);
  if (!/e/i.test(raw)) {
    return raw;
  }

  const sign = value < 0 ? '-' : '';
  const unsigned = raw.startsWith('-') ? raw.slice(1) : raw;
  const [mantissaRaw, exponentRaw] = unsigned.split(/e/i);
  const exponent = Number(exponentRaw);
  if (!Number.isInteger(exponent)) {
    return raw;
  }
  const [whole, fraction = ''] = mantissaRaw.split('.');
  const digits = `${whole}${fraction}`;
  const decimalIndex = whole.length + exponent;

  if (decimalIndex <= 0) {
    return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`;
  }
  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

/**
 * Parses a decimal string or finite number into integer minor units using the given currency exponent (0..3).
 * Extra fraction digits are allowed only if they are trailing zeros (e.g. "19.990" with exponent 2 yields 1999).
 * Non-zero extra fraction digits (e.g. "1.2345" with exponent 2) are rejected (returns undefined).
 */
export function minorUnitsFromDecimal(
  value: string | number,
  exponent: CurrencyExponent,
): number | undefined {
  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    text = numberToPlainDecimalText(value);
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
  exponent: CurrencyExponent,
): string {
  if (exponent === 0) {
    return String(Math.trunc(minorUnits));
  }

  const factor = Math.pow(10, exponent);
  const whole = Math.trunc(minorUnits / factor);
  const fraction = Math.abs(minorUnits % factor);
  return `${whole}.${String(fraction).padStart(exponent, '0')}`;
}

/** Formats a signed minor-unit integer as a major-unit number. */
export function majorUnitsFromSignedMinor(
  minorUnits: number,
  exponent: CurrencyExponent,
): number {
  const sign = minorUnits < 0 ? -1 : 1;
  return sign * Number(decimalFromMinorUnits(Math.abs(minorUnits), exponent));
}
