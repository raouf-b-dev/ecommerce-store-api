const INTEGER_PATTERN = /^\d+$/;
const DECIMAL_PATTERN_SCALE_1 = /^\d+\.\d$/;
const DECIMAL_PATTERN_SCALE_2 = /^\d+\.\d{1,2}$/;
const DECIMAL_PATTERN_SCALE_3 = /^\d+\.\d{1,3}$/;

function isValidDecimalText(text: string, scale: number): boolean {
  if (!text.includes('.')) {
    return INTEGER_PATTERN.test(text);
  }
  if (scale === 0) {
    return false;
  }
  if (scale === 1) {
    return DECIMAL_PATTERN_SCALE_1.test(text);
  }
  if (scale === 2) {
    return DECIMAL_PATTERN_SCALE_2.test(text);
  }
  if (scale === 3) {
    return DECIMAL_PATTERN_SCALE_3.test(text);
  }
  return false;
}

/**
 * Parses a decimal string or finite number into integer minor units according to currency scale.
 * Defaults to scale 2 (cents).
 */
export function minorUnitsFromDecimal(
  value: string | number,
  scale = 2,
): number | undefined {
  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    text = scale === 0 ? String(Math.round(value)) : value.toFixed(scale);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return undefined;
  }

  if (!isValidDecimalText(text, scale)) {
    return undefined;
  }

  const factor = Math.pow(10, scale);
  if (scale === 0) {
    const minor = Number(text);
    return Number.isSafeInteger(minor) && minor >= 0 ? minor : undefined;
  }

  const dot = text.indexOf('.');
  const whole = dot === -1 ? text : text.slice(0, dot);
  const fractionRaw = dot === -1 ? '' : text.slice(dot + 1);
  const fraction = fractionRaw.padEnd(scale, '0');
  const minor = Number(whole) * factor + Number(fraction);

  if (!Number.isSafeInteger(minor) || minor < 0) {
    return undefined;
  }
  return minor;
}

/** Formats integer minor units as a formatted decimal string according to currency scale. */
export function decimalFromMinorUnits(minorUnits: number, scale = 2): string {
  if (scale === 0) {
    return String(minorUnits);
  }
  const factor = Math.pow(10, scale);
  const whole = Math.trunc(minorUnits / factor);
  const fraction = Math.abs(minorUnits % factor);
  return `${whole}.${String(fraction).padStart(scale, '0')}`;
}
