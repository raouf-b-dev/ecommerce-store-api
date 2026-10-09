import { decimalFromMinorUnits, minorUnitsFromDecimal } from './money-decimal';

describe('minorUnitsFromDecimal', () => {
  it('returns minor units when the decimal has a scale of two or less', () => {
    expect(minorUnitsFromDecimal('19.99')).toBe(1999);
    expect(minorUnitsFromDecimal('19.9')).toBe(1990);
    expect(minorUnitsFromDecimal('20')).toBe(2000);
    expect(minorUnitsFromDecimal(19.99)).toBe(1999);
  });

  it('returns undefined when the text is not a scale-2 decimal', () => {
    expect(minorUnitsFromDecimal('19.999')).toBeUndefined();
    expect(minorUnitsFromDecimal('-1.00')).toBeUndefined();
    expect(minorUnitsFromDecimal('')).toBeUndefined();
    expect(minorUnitsFromDecimal(Number.NaN)).toBeUndefined();
  });
  it('supports zero-decimal currencies (scale 0)', () => {
    expect(minorUnitsFromDecimal('1000', 0)).toBe(1000);
    expect(minorUnitsFromDecimal(1000, 0)).toBe(1000);
    expect(minorUnitsFromDecimal('1000.50', 0)).toBeUndefined();
  });

  it('supports three-decimal currencies (scale 3)', () => {
    expect(minorUnitsFromDecimal('5.125', 3)).toBe(5125);
    expect(minorUnitsFromDecimal('5.12', 3)).toBe(5120);
    expect(minorUnitsFromDecimal('5.1234', 3)).toBeUndefined();
  });
});

describe('decimalFromMinorUnits', () => {
  it('formats minor units as a scale-2 decimal', () => {
    expect(decimalFromMinorUnits(1999)).toBe('19.99');
    expect(decimalFromMinorUnits(2000)).toBe('20.00');
    expect(decimalFromMinorUnits(5)).toBe('0.05');
  });

  it('formats zero-decimal minor units without decimal point', () => {
    expect(decimalFromMinorUnits(1000, 0)).toBe('1000');
  });

  it('formats three-decimal minor units', () => {
    expect(decimalFromMinorUnits(5125, 3)).toBe('5.125');
    expect(decimalFromMinorUnits(5120, 3)).toBe('5.120');
  });
});
