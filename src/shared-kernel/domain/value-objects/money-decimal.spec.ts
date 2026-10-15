import {
  decimalFromMinorUnits,
  majorUnitsFromSignedMinor,
  minorUnitsFromDecimal,
} from './money-decimal';

describe('minorUnitsFromDecimal', () => {
  it('parses scale-2 decimals correctly', () => {
    expect(minorUnitsFromDecimal('19.99', 2)).toBe(1999);
    expect(minorUnitsFromDecimal('19.9', 2)).toBe(1990);
    expect(minorUnitsFromDecimal('20', 2)).toBe(2000);
    expect(minorUnitsFromDecimal(19.99, 2)).toBe(1999);
  });

  it('allows extra fraction digits only if they are zeros', () => {
    expect(minorUnitsFromDecimal('19.990', 2)).toBe(1999);
    expect(minorUnitsFromDecimal('19.9900', 2)).toBe(1999);
    expect(minorUnitsFromDecimal('1.2340', 3)).toBe(1234);
    expect(minorUnitsFromDecimal('1000.00', 0)).toBe(1000);
  });

  it('rejects extra fraction digits when they contain non-zero digits', () => {
    expect(minorUnitsFromDecimal('1.2345', 2)).toBeUndefined();
    expect(minorUnitsFromDecimal('19.999', 2)).toBeUndefined();
    expect(minorUnitsFromDecimal('1.2345', 3)).toBeUndefined();
    expect(minorUnitsFromDecimal('1000.5', 0)).toBeUndefined();
  });

  it('parses zero-decimal currencies (exponent 0)', () => {
    expect(minorUnitsFromDecimal('1000', 0)).toBe(1000);
    expect(minorUnitsFromDecimal(1000, 0)).toBe(1000);
    expect(minorUnitsFromDecimal('0', 0)).toBe(0);
  });

  it('parses three-decimal currencies (exponent 3)', () => {
    expect(minorUnitsFromDecimal('1.234', 3)).toBe(1234);
    expect(minorUnitsFromDecimal('1.2', 3)).toBe(1200);
    expect(minorUnitsFromDecimal('5', 3)).toBe(5000);
    expect(minorUnitsFromDecimal(1.234, 3)).toBe(1234);
  });

  it('returns undefined for negative values or invalid formats', () => {
    expect(minorUnitsFromDecimal('-1.00', 2)).toBeUndefined();
    expect(minorUnitsFromDecimal('', 2)).toBeUndefined();
    expect(minorUnitsFromDecimal('abc', 2)).toBeUndefined();
    expect(minorUnitsFromDecimal(Number.NaN, 2)).toBeUndefined();
    expect(minorUnitsFromDecimal(-5, 2)).toBeUndefined();
  });

  it('expands scientific notation from numeric input before validation', () => {
    expect(String(1e-7)).toMatch(/e/i);
    expect(minorUnitsFromDecimal(1e-7, 2)).toBeUndefined();
    expect(minorUnitsFromDecimal(1e2, 2)).toBe(10000);
  });
});

describe('majorUnitsFromSignedMinor', () => {
  it('preserves the sign for amounts between -1 and 0', () => {
    expect(majorUnitsFromSignedMinor(-50, 2)).toBe(-0.5);
    expect(majorUnitsFromSignedMinor(-1999, 2)).toBe(-19.99);
    expect(majorUnitsFromSignedMinor(0, 2)).toBe(0);
  });
});

describe('decimalFromMinorUnits', () => {
  it('formats scale-2 minor units', () => {
    expect(decimalFromMinorUnits(1999, 2)).toBe('19.99');
    expect(decimalFromMinorUnits(2000, 2)).toBe('20.00');
    expect(decimalFromMinorUnits(5, 2)).toBe('0.05');
  });

  it('formats zero-decimal minor units', () => {
    expect(decimalFromMinorUnits(1000, 0)).toBe('1000');
    expect(decimalFromMinorUnits(5, 0)).toBe('5');
    expect(decimalFromMinorUnits(0, 0)).toBe('0');
  });

  it('formats three-decimal minor units', () => {
    expect(decimalFromMinorUnits(1234, 3)).toBe('1.234');
    expect(decimalFromMinorUnits(5, 3)).toBe('0.005');
    expect(decimalFromMinorUnits(2000, 3)).toBe('2.000');
  });
});
