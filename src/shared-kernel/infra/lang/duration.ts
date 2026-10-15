import { type StringValue } from 'ms';

const DURATION_UNITS = [
  'years',
  'year',
  'yrs',
  'yr',
  'y',
  'weeks',
  'week',
  'w',
  'days',
  'day',
  'd',
  'hours',
  'hour',
  'hrs',
  'hr',
  'h',
  'minutes',
  'minute',
  'mins',
  'min',
  'm',
  'seconds',
  'second',
  'secs',
  'sec',
  's',
  'milliseconds',
  'millisecond',
  'msecs',
  'msec',
  'ms',
] as const;

function isDurationUnit(value: string): boolean {
  const unit = value.toLowerCase();
  for (const known of DURATION_UNITS) {
    if (known === unit) {
      return true;
    }
  }
  return false;
}

function isNumberText(value: string): boolean {
  if (value.length === 0 || value.startsWith('.') || value.endsWith('.')) {
    return false;
  }
  let seenDot = false;
  let seenDigit = false;
  for (const char of value) {
    if (char === '.') {
      if (seenDot) {
        return false;
      }
      seenDot = true;
      continue;
    }
    if (char < '0' || char > '9') {
      return false;
    }
    seenDigit = true;
  }
  return seenDigit;
}

function isDuration(value: string): value is StringValue {
  let index = 0;
  while (index < value.length) {
    const char = value[index];
    if (char !== '.' && (char < '0' || char > '9')) {
      break;
    }
    index += 1;
  }
  if (!isNumberText(value.slice(0, index))) {
    return false;
  }
  let unit = value.slice(index);
  if (unit.startsWith(' ')) {
    unit = unit.slice(1);
  }
  if (unit.includes(' ')) {
    return false;
  }
  return unit.length === 0 || isDurationUnit(unit);
}

/**
 * Accepts the same duration strings as the `ms` package, for example `15m` or `7d`.
 * Returns undefined when the text is not a duration.
 */
export function parseDuration(value: string): StringValue | undefined {
  const trimmed = value.trim();
  if (!isDuration(trimmed)) {
    return undefined;
  }
  return trimmed;
}
