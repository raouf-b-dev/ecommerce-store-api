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
});

describe('decimalFromMinorUnits', () => {
  it('formats minor units as a scale-2 decimal', () => {
    expect(decimalFromMinorUnits(1999)).toBe('19.99');
    expect(decimalFromMinorUnits(2000)).toBe('20.00');
    expect(decimalFromMinorUnits(5)).toBe('0.05');
  });
});
